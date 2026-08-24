"use client";

import React, { useMemo, useState } from "react";
import { AtUri } from "@atproto/syntax";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Checkbox } from "components/Checkbox";
import { Input } from "components/Input";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import type { AdminPublicationSearchResult } from "actions/admin/importSubscribers";
import {
  getGhostImportTarget,
  previewGhostImport,
  importGhostPost,
  type GhostImportError,
  type GhostImportTarget,
  type GhostImportMode,
  type GhostPostPreview as Preview,
  type ImportedGhostPost,
} from "actions/admin/importGhost";
import {
  parseGhostExport,
  type GhostExport,
  type GhostPost,
} from "src/ghostImport/parseGhostExport";
import { PublicationPicker } from "../PublicationPicker";
import { GhostPostPreview } from "./GhostPostPreview";

const ERROR_MESSAGES: Record<GhostImportError, string> = {
  unauthorized: "You're not allowed to do that.",
  invalid_input: "That input doesn't look right.",
  publication_not_found: "That publication doesn't exist.",
  already_published: "A post with that slug is already published here.",
  database_error: "Something went wrong. Please try again.",
};

type PostStatus =
  | { state: "pending" }
  | { state: "importing" }
  | { state: "done"; result: ImportedGhostPost }
  | { state: "failed"; error: string };

export function AdminImportGhost() {
  let toaster = useToaster();
  let [target, setTarget] = useState<GhostImportTarget | null>(null);
  let [loadingTarget, setLoadingTarget] = useState(false);
  let [file, setFile] = useState<{
    name: string;
    export: GhostExport;
  } | null>(null);
  let [siteUrl, setSiteUrl] = useState("");
  let [selected, setSelected] = useState<Set<string>>(new Set());
  let [mode, setMode] = useState<GhostImportMode>("publish");
  let [useSlugAsRkey, setUseSlugAsRkey] = useState(true);
  let [gateMembersOnly, setGateMembersOnly] = useState(true);
  let [showInDiscover, setShowInDiscover] = useState(false);
  let [previews, setPreviews] = useState<Map<string, Preview> | null>(null);
  let [previewing, setPreviewing] = useState(false);
  let [expanded, setExpanded] = useState<string | null>(null);
  let [statuses, setStatuses] = useState<Map<string, PostStatus>>(new Map());
  let [importing, setImporting] = useState(false);

  let posts = file?.export.posts ?? [];
  let existingRkeys = useMemo(
    () => new Set(target?.existingRkeys ?? []),
    [target],
  );
  let siteUrlValid = useMemo(() => {
    try {
      let u = new URL(siteUrl);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, [siteUrl]);
  let options = { siteUrl: siteUrl.trim(), gateMembersOnly };
  let publishing = mode === "publish";
  let alreadyPublished = (p: GhostPost) =>
    publishing && useSlugAsRkey && existingRkeys.has(p.slug);

  // Any change to the inputs invalidates the preview and per-post results —
  // the import button only ever acts on a preview of the current inputs.
  let invalidate = () => {
    setPreviews(null);
    setStatuses(new Map());
    setExpanded(null);
  };

  let choosePublication = async (p: AdminPublicationSearchResult | null) => {
    invalidate();
    if (!p) {
      setTarget(null);
      return;
    }
    setLoadingTarget(true);
    let res = await getGhostImportTarget(p.uri);
    setLoadingTarget(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    setTarget(res.value);
  };

  let onFile = async (f: File | undefined) => {
    invalidate();
    setSelected(new Set());
    if (!f) {
      setFile(null);
      return;
    }
    let text = await f.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      toaster({ type: "error", content: "That file isn't valid JSON." });
      return;
    }
    let parsed = parseGhostExport(json);
    if (!parsed.ok) {
      toaster({ type: "error", content: parsed.error });
      return;
    }
    setFile({ name: f.name, export: parsed.value });
    // Published posts are the default selection; pages, drafts, and
    // scheduled posts are opted into by hand.
    setSelected(
      new Set(
        parsed.value.posts
          .filter((p) => p.type === "post" && p.status === "published")
          .map((p) => p.id),
      ),
    );
  };

  let selectedPosts = posts.filter(
    (p) => selected.has(p.id) && !alreadyPublished(p),
  );

  let runPreview = async () => {
    if (!target || selectedPosts.length === 0 || previewing) return;
    setPreviewing(true);
    let res = await previewGhostImport({ posts: selectedPosts, options });
    setPreviewing(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    setPreviews(new Map(res.value.map((p) => [p.ghostId, p])));
    setStatuses(new Map());
  };

  let runImport = async () => {
    if (!target || !previews || importing) return;
    setImporting(true);
    let next = new Map<string, PostStatus>();
    for (let p of selectedPosts) next.set(p.id, { state: "pending" });
    setStatuses(new Map(next));
    let done = 0;
    let failed = 0;
    // One post per request: each one fetches and uploads its images, so a
    // single call for the whole export would outlive a server action.
    for (let post of selectedPosts) {
      next.set(post.id, { state: "importing" });
      setStatuses(new Map(next));
      try {
        let res = await importGhostPost({
          post,
          publicationUri: target.uri,
          options,
          mode,
          useSlugAsRkey,
          showInDiscover,
        });
        if (res.ok) {
          next.set(post.id, { state: "done", result: res.value });
          if (res.value.publishError) failed++;
          else done++;
        } else {
          next.set(post.id, {
            state: "failed",
            error: ERROR_MESSAGES[res.error],
          });
          failed++;
        }
      } catch (e) {
        next.set(post.id, {
          state: "failed",
          error: e instanceof Error ? e.message : String(e),
        });
        failed++;
      }
      setStatuses(new Map(next));
    }
    setImporting(false);
    toaster({
      type: failed === 0 ? "success" : "error",
      content: `Imported ${done} post${done === 1 ? "" : "s"} to ${target.name}${failed ? `, ${failed} failed` : ""}`,
    });
  };

  let importDisabled = !target || (publishing && !target.ownerSessionOk);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h2>Import from Ghost</h2>
        <div className="text-secondary leading-snug">
          Turn a Ghost export (Settings → Advanced → Import/Export → Export
          content) into drafts in a publication, optionally publishing each one
          as a post on the publication owner&apos;s behalf. Images are copied
          into Leaflet storage. Subscribers are never emailed about imported
          posts.
        </div>
      </div>

      <PublicationPicker
        publication={
          target
            ? {
                uri: target.uri,
                name: target.name,
                identity_did: target.identity_did,
                handle: target.handle,
                subscriberCount: 0,
              }
            : null
        }
        onChange={choosePublication}
      />
      {loadingTarget && <DotLoader />}
      {target && (
        <div className="text-xs text-tertiary -mt-6 flex flex-col gap-0.5">
          <div>
            {target.existingRkeys.length} published post
            {target.existingRkeys.length === 1 ? "" : "s"} already in this
            publication.
          </div>
          {!target.ownerSessionOk && (
            <div className="text-accent-1">
              The owner has no active Leaflet session, so posts can&apos;t be
              published to their PDS from here — only drafts can be created
              until they sign in again.
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3>Ghost export</h3>
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {file && (
          <div className="text-xs text-tertiary">
            <span className="font-mono">{file.name}</span>
            {file.export.site.title && <> · {file.export.site.title}</>} ·{" "}
            {file.export.counts.posts} posts, {file.export.counts.pages} pages,{" "}
            {file.export.counts.tags} tags
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">
            Ghost site URL — the export refers to images by a placeholder, and
            they&apos;re fetched from here
          </span>
          <Input
            className="input-with-border"
            placeholder="https://blog.example.com"
            value={siteUrl}
            onChange={(e) => {
              setSiteUrl(e.target.value);
              invalidate();
            }}
          />
          {siteUrl && !siteUrlValid && (
            <span className="text-accent-1 text-xs">
              Enter a full http(s) URL.
            </span>
          )}
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <h3>Options</h3>
        <div className="flex flex-col gap-1">
          <ModeRadio
            value="publish"
            current={mode}
            onChange={(m) => {
              setMode(m);
              invalidate();
            }}
            label="Create drafts and publish"
            description="Each post is published as the owner, backdated to its Ghost publish date."
          />
          <ModeRadio
            value="draft"
            current={mode}
            onChange={(m) => {
              setMode(m);
              invalidate();
            }}
            label="Create drafts only"
            description="Posts appear in the publication's drafts for the owner to publish."
          />
        </div>
        <Checkbox
          small
          checked={useSlugAsRkey}
          onChange={(e) => {
            setUseSlugAsRkey(e.target.checked);
            invalidate();
          }}
        >
          <span>
            Use Ghost slugs as record keys, so post URLs keep their paths (e.g.{" "}
            <span className="font-mono">/my-post</span>). Posts whose slug is
            already published are skipped.
          </span>
        </Checkbox>
        <Checkbox
          small
          checked={gateMembersOnly}
          onChange={(e) => {
            setGateMembersOnly(e.target.checked);
            invalidate();
          }}
        >
          Keep members-only and paid posts gated by placing a members-only
          delimiter at the top of the post.
        </Checkbox>
        <Checkbox
          small
          checked={showInDiscover}
          onChange={(e) => {
            setShowInDiscover(e.target.checked);
            invalidate();
          }}
        >
          Show published posts in Discover and aggregated feeds.
        </Checkbox>
      </div>

      {posts.length > 0 && (
        <PostTable
          posts={posts}
          selected={selected}
          alreadyPublished={alreadyPublished}
          previews={previews}
          statuses={statuses}
          target={target}
          expanded={expanded}
          onToggleExpanded={(id) => setExpanded(expanded === id ? null : id)}
          onChange={(next) => {
            setSelected(next);
            invalidate();
          }}
        />
      )}

      <div className="flex flex-col gap-3">
        <h3>Preview</h3>
        {!previews && (
          <ButtonSecondary
            className="self-start"
            disabled={
              !target ||
              !siteUrlValid ||
              selectedPosts.length === 0 ||
              previewing
            }
            onClick={runPreview}
          >
            {previewing ? (
              <DotLoader />
            ) : (
              `Preview ${selectedPosts.length} post${selectedPosts.length === 1 ? "" : "s"}`
            )}
          </ButtonSecondary>
        )}
        {previews && target && (
          <div className="flex flex-col gap-3 border border-border-light rounded-md p-3">
            <PreviewSummary
              previews={[...previews.values()]}
              mode={mode}
              target={target}
            />
            <div className="text-xs text-tertiary">
              Expand a post in the table above to see how it will render.
              Nothing has been written yet.
            </div>
            <div className="flex justify-end gap-2">
              <ButtonSecondary
                compact
                onClick={invalidate}
                disabled={importing}
              >
                Discard preview
              </ButtonSecondary>
              <ButtonPrimary
                disabled={importing || importDisabled || statuses.size > 0}
                onClick={runImport}
              >
                {importing ? (
                  <DotLoader />
                ) : (
                  `${publishing ? "Import and publish" : "Import as drafts"} (${selectedPosts.length})`
                )}
              </ButtonPrimary>
            </div>
          </div>
        )}
        {statuses.size > 0 && target && (
          <ResultCard
            statuses={statuses}
            posts={selectedPosts}
            target={target}
          />
        )}
      </div>
    </div>
  );
}

function ModeRadio(props: {
  value: GhostImportMode;
  current: GhostImportMode;
  onChange: (m: GhostImportMode) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-baseline gap-2 text-sm cursor-pointer">
      <input
        type="radio"
        name="ghost-import-mode"
        checked={props.current === props.value}
        onChange={() => props.onChange(props.value)}
      />
      <span>
        <span className="font-bold text-primary">{props.label}</span>{" "}
        <span className="text-tertiary">{props.description}</span>
      </span>
    </label>
  );
}

function PostTable(props: {
  posts: GhostPost[];
  selected: Set<string>;
  alreadyPublished: (p: GhostPost) => boolean;
  previews: Map<string, Preview> | null;
  statuses: Map<string, PostStatus>;
  target: GhostImportTarget | null;
  expanded: string | null;
  onToggleExpanded: (id: string) => void;
  onChange: (next: Set<string>) => void;
}) {
  let selectable = props.posts.filter((p) => !props.alreadyPublished(p));
  let allSelected =
    selectable.length > 0 && selectable.every((p) => props.selected.has(p.id));
  let someSelected = selectable.some((p) => props.selected.has(p.id));
  let toggleAll = () =>
    props.onChange(
      allSelected ? new Set() : new Set(selectable.map((p) => p.id)),
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3>Posts</h3>
        <div className="text-xs text-tertiary">
          {props.selected.size} of {props.posts.length} selected
        </div>
      </div>
      <div className="border border-border-light rounded-md overflow-hidden text-sm">
        <div className="flex items-center gap-2 px-3 py-2 bg-bg-page border-b border-border-light">
          <Checkbox
            small
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
          >
            <span className="text-tertiary">Select all importable</span>
          </Checkbox>
        </div>
        {props.posts.map((p) => {
          let skipped = props.alreadyPublished(p);
          let preview = props.previews?.get(p.id);
          let status = props.statuses.get(p.id);
          let isExpanded = props.expanded === p.id;
          return (
            <div
              key={p.id}
              className="border-b border-border-light last:border-b-0"
            >
              <div className="flex items-start gap-2 px-3 py-2">
                <Checkbox
                  small
                  checked={props.selected.has(p.id) && !skipped}
                  onChange={(e) => {
                    let next = new Set(props.selected);
                    if (e.target.checked) next.add(p.id);
                    else next.delete(p.id);
                    props.onChange(next);
                  }}
                  className={skipped ? "opacity-50" : ""}
                >
                  <span className="flex flex-col gap-0.5 min-w-0 font-normal">
                    <span className="text-primary">{p.title}</span>
                    <span className="text-xs text-tertiary flex flex-wrap gap-x-2">
                      <span className="font-mono">/{p.slug}</span>
                      <Badge>{p.type}</Badge>
                      {p.status !== "published" && (
                        <Badge warn>{p.status}</Badge>
                      )}
                      {p.visibility !== "public" && (
                        <Badge warn>{p.visibility}</Badge>
                      )}
                      {p.publishedAt && (
                        <span>{p.publishedAt.slice(0, 10)}</span>
                      )}
                      {p.tags.length > 0 && <span>{p.tags.join(", ")}</span>}
                      {skipped && <Badge warn>already published</Badge>}
                    </span>
                    {preview && (
                      <span className="text-xs text-tertiary flex flex-wrap gap-x-2">
                        <span>
                          {preview.blocks.length} block
                          {preview.blocks.length === 1 ? "" : "s"}
                        </span>
                        <span>
                          {preview.imageCount} image
                          {preview.imageCount === 1 ? "" : "s"}
                        </span>
                        {preview.warnings.map((w, i) => (
                          <span key={i} className="text-accent-1">
                            ⚠ {w.detail}
                          </span>
                        ))}
                      </span>
                    )}
                    {status && (
                      <StatusLine status={status} target={props.target} />
                    )}
                  </span>
                </Checkbox>
                {preview && (
                  <ButtonSecondary
                    compact
                    className="shrink-0"
                    onClick={() => props.onToggleExpanded(p.id)}
                  >
                    {isExpanded ? "Hide" : "Preview"}
                  </ButtonSecondary>
                )}
              </div>
              {preview && isExpanded && props.target && (
                <div className="px-3 pb-3">
                  <GhostPostPreview target={props.target} preview={preview} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Badge(props: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span
      className={`px-1 rounded-sm border ${props.warn ? "border-accent-1 text-accent-1" : "border-border-light text-tertiary"}`}
    >
      {props.children}
    </span>
  );
}

function postUrl(target: GhostImportTarget, rkey: string) {
  return `/lish/${target.identity_did}/${new AtUri(target.uri).rkey}/${rkey}`;
}

function StatusLine(props: {
  status: PostStatus;
  target: GhostImportTarget | null;
}) {
  let { status, target } = props;
  if (status.state === "pending")
    return <span className="text-xs text-tertiary">Waiting…</span>;
  if (status.state === "importing")
    return <span className="text-xs text-tertiary">Importing…</span>;
  if (status.state === "failed")
    return (
      <span className="text-xs text-accent-1">Failed: {status.error}</span>
    );
  let r = status.result;
  return (
    <span className="text-xs flex flex-wrap gap-x-2">
      <a
        className="text-accent-contrast hover:underline"
        href={`/${r.leafletId}`}
        target="_blank"
        rel="noreferrer"
      >
        Edit draft
      </a>
      {r.rkey && target && (
        <a
          className="text-accent-contrast hover:underline"
          href={postUrl(target, r.rkey)}
          target="_blank"
          rel="noreferrer"
        >
          View post
        </a>
      )}
      {r.publishError && (
        <span className="text-accent-1">
          Draft created, publish failed: {r.publishError}
        </span>
      )}
      {r.warnings
        .filter((w) => w.kind === "image_failed" || w.kind === "slug_not_rkey")
        .map((w, i) => (
          <span key={i} className="text-accent-1">
            ⚠ {w.detail}
          </span>
        ))}
    </span>
  );
}

function PreviewSummary(props: {
  previews: Preview[];
  mode: GhostImportMode;
  target: GhostImportTarget;
}) {
  let blocks = props.previews.reduce((n, p) => n + p.blocks.length, 0);
  let images = props.previews.reduce((n, p) => n + p.imageCount, 0);
  let warnings = props.previews.reduce((n, p) => n + p.warnings.length, 0);
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm self-start">
      <StatRow label="Posts to import" value={props.previews.length} bold />
      <StatRow label="Blocks" value={blocks} />
      <StatRow label="Images to copy" value={images} />
      <StatRow label="Warnings" value={warnings} />
      <div className="text-tertiary">Outcome</div>
      <div className="text-right text-secondary">
        {props.mode === "publish"
          ? `published as @${props.target.handle ?? props.target.identity_did}`
          : "drafts"}
      </div>
    </div>
  );
}

function StatRow(props: { label: string; value: number; bold?: boolean }) {
  return (
    <>
      <div className="text-tertiary">{props.label}</div>
      <div
        className={`text-right tabular-nums ${props.bold ? "font-bold text-primary" : "text-secondary"}`}
      >
        {props.value}
      </div>
    </>
  );
}

function ResultCard(props: {
  statuses: Map<string, PostStatus>;
  posts: GhostPost[];
  target: GhostImportTarget;
}) {
  let all = [...props.statuses.values()];
  let done = all.filter(
    (s) => s.state === "done" && !s.result.publishError,
  ).length;
  let failed = all.filter(
    (s) =>
      s.state === "failed" || (s.state === "done" && !!s.result.publishError),
  ).length;
  let remaining = all.filter(
    (s) => s.state === "pending" || s.state === "importing",
  ).length;
  return (
    <div className="flex flex-col gap-2 border border-border-light rounded-md p-3">
      <div className="font-bold text-primary text-sm">
        {remaining > 0 ? "Importing…" : "Import complete"}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm self-start">
        <StatRow label="Imported" value={done} bold />
        <StatRow label="Failed" value={failed} />
        <StatRow label="Remaining" value={remaining} />
      </div>
      <div className="text-xs text-tertiary">
        Per-post links are in the table above. Re-running an import creates new
        drafts; with slug record keys, already-published posts are skipped.
      </div>
    </div>
  );
}
