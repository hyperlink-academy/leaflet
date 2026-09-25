"use client";

import React, { useState } from "react";
import { AtUri } from "@atproto/syntax";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Checkbox } from "components/Checkbox";
import { Input } from "components/Input";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import type { AdminPublicationSearchResult } from "actions/admin/importSubscribers";
import {
  previewGhostImport,
  importGhostPost,
  publishGhostPages,
  type GhostImportMode,
  type GhostImportResult,
  type GhostPostPreview as Preview,
} from "actions/admin/importGhost";
import {
  parseGhostExport,
  type GhostPost,
} from "src/ghostImport/parseGhostExport";
import { PublicationPicker } from "../PublicationPicker";
import { ImportPreview } from "./ImportPreview";
import {
  Badge,
  ExternalLink,
  ImportOptions,
  SelectAllHeader,
  type PathMode,
} from "./ImportShared";

type PostStatus =
  | { state: "importing" }
  | { state: "done"; result: GhostImportResult }
  | { state: "failed"; error: string };

type PagesStatus =
  | { state: "publishing" }
  | { state: "published" }
  | { state: "failed"; error: string };

export function AdminImportGhost() {
  let toaster = useToaster();
  let [publication, setPublication] =
    useState<AdminPublicationSearchResult | null>(null);
  let [file, setFile] = useState<{ name: string; posts: GhostPost[] } | null>(
    null,
  );
  let [siteUrl, setSiteUrl] = useState("");
  let [selected, setSelected] = useState<Set<string>>(new Set());
  let [mode, setMode] = useState<GhostImportMode>("publish");
  let [pathMode, setPathMode] = useState<PathMode>("source");
  let [showInDiscover, setShowInDiscover] = useState(false);
  let [previews, setPreviews] = useState<Map<string, Preview>>(new Map());
  let [expanded, setExpanded] = useState<string | null>(null);
  let [statuses, setStatuses] = useState<Map<string, PostStatus>>(new Map());
  let [pagesStatus, setPagesStatus] = useState<PagesStatus | null>(null);
  let [importing, setImporting] = useState(false);

  let posts = file?.posts ?? [];
  let siteUrlValid = /^https?:\/\/\S+$/.test(siteUrl.trim());
  let selectedPosts = posts.filter((p) => selected.has(p.id));

  let onFile = async (f: File | undefined) => {
    setFile(null);
    setSelected(new Set());
    setPreviews(new Map());
    setStatuses(new Map());
    setPagesStatus(null);
    if (!f) return;
    try {
      let posts = parseGhostExport(JSON.parse(await f.text()));
      setFile({ name: f.name, posts });
      // Published posts and pages are the default selection; drafts and
      // scheduled posts are opted into by hand.
      setSelected(
        new Set(posts.filter((p) => p.status === "published").map((p) => p.id)),
      );
    } catch (e) {
      toaster({ type: "error", content: String(e) });
    }
  };

  let togglePreview = async (post: GhostPost) => {
    if (expanded === post.id) return setExpanded(null);
    setExpanded(post.id);
    if (previews.has(post.id)) return;
    let res = await previewGhostImport({ post, siteUrl: siteUrl.trim() });
    if (!res.ok) {
      toaster({ type: "error", content: res.error });
      setExpanded(null);
      return;
    }
    setPreviews((prev) => new Map(prev).set(post.id, res.value));
  };

  let runImport = async () => {
    if (!publication || importing) return;
    setImporting(true);
    setPagesStatus(null);
    let next = new Map<string, PostStatus>();
    let failed = 0;
    let pagesImported = 0;
    // One post per request: each one fetches and uploads its images, so a
    // single call for the whole export would outlive a server action.
    for (let post of selectedPosts) {
      setStatuses(new Map(next.set(post.id, { state: "importing" })));
      let res = await importGhostPost({
        post,
        publicationUri: publication.uri,
        siteUrl: siteUrl.trim(),
        mode,
        pathMode,
        showInDiscover,
      });
      if (res.ok) {
        next.set(post.id, { state: "done", result: res.value });
        if (res.value.kind === "page") pagesImported++;
      } else {
        next.set(post.id, { state: "failed", error: res.error });
        failed++;
      }
      setStatuses(new Map(next));
    }
    // Pages all land in the one draft leaflet, so they publish in one go.
    if (mode === "publish" && pagesImported > 0) {
      setPagesStatus({ state: "publishing" });
      let res = await publishGhostPages({ publicationUri: publication.uri });
      if (res.ok) setPagesStatus({ state: "published" });
      else {
        setPagesStatus({ state: "failed", error: res.error });
        failed++;
      }
    }
    setImporting(false);
    toaster({
      type: failed === 0 ? "success" : "error",
      content: `Imported ${selectedPosts.length - failed} of ${selectedPosts.length} posts and pages to ${publication.name}`,
    });
  };

  return (
    <>
      <PublicationPicker publication={publication} onChange={setPublication} />

      <div className="flex flex-col gap-3">
        <h3>Ghost export</h3>
        <div className="text-tertiary text-sm leading-snug">
          Settings → Advanced → Import/Export → Export content. Ghost pages
          become pages in the publication&apos;s navigation, at the same /slug.
          Members-only and paid posts are placed behind a members-only
          delimiter.
        </div>
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {file && (
          <div className="text-xs text-tertiary">
            <span className="font-mono">{file.name}</span> · {posts.length}{" "}
            posts and pages
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
            onChange={(e) => setSiteUrl(e.target.value)}
          />
        </label>
      </div>

      <ImportOptions
        mode={mode}
        onModeChange={setMode}
        pathMode={pathMode}
        onPathModeChange={setPathMode}
        showInDiscover={showInDiscover}
        onShowInDiscoverChange={setShowInDiscover}
        publishDescription="Each post is published as the owner, backdated to its Ghost publish date. Pages are added to the publication's navigation and published along with any pending page edits."
        draftDescription="Posts appear in the publication's drafts, and pages in its page editor, for the owner to publish."
        sourcePathDescription="Posts keep their Ghost slug: /my-post stays /my-post. Pages always keep their slug."
        leafletPathDescription="Posts get a fresh record key, like /3mvj2xk5qzc2a."
      />

      {posts.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3>Posts and pages</h3>
            <div className="text-xs text-tertiary">
              {selected.size} of {posts.length} selected
            </div>
          </div>
          <div className="border border-border-light rounded-md overflow-hidden text-sm">
            <SelectAllHeader
              selected={selected.size}
              total={posts.length}
              onToggle={() =>
                setSelected(
                  selected.size === posts.length
                    ? new Set()
                    : new Set(posts.map((p) => p.id)),
                )
              }
            />
            {posts.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                selected={selected.has(p.id)}
                onSelect={(checked) => {
                  let next = new Set(selected);
                  if (checked) next.add(p.id);
                  else next.delete(p.id);
                  setSelected(next);
                }}
                preview={
                  expanded === p.id ? previews.get(p.id) ?? "loading" : null
                }
                canPreview={siteUrlValid}
                onTogglePreview={() => togglePreview(p)}
                status={statuses.get(p.id)}
                pagesPublished={pagesStatus?.state === "published"}
                publication={publication}
              />
            ))}
          </div>
          {pagesStatus && (
            <div className="text-sm">
              {pagesStatus.state === "publishing" && (
                <span className="text-tertiary">Publishing pages…</span>
              )}
              {pagesStatus.state === "published" && (
                <span className="text-tertiary">Pages published.</span>
              )}
              {pagesStatus.state === "failed" && (
                <span className="text-accent-1">
                  Pages were added to the draft but publishing them failed:{" "}
                  {pagesStatus.error}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <ButtonPrimary
        className="self-start"
        disabled={
          !publication ||
          !siteUrlValid ||
          selectedPosts.length === 0 ||
          importing
        }
        onClick={runImport}
      >
        {importing ? (
          <DotLoader />
        ) : (
          `${mode === "publish" ? "Import and publish" : "Import as drafts"} (${selectedPosts.length})`
        )}
      </ButtonPrimary>
    </>
  );
}

function PostRow(props: {
  post: GhostPost;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  preview: Preview | "loading" | null;
  canPreview: boolean;
  onTogglePreview: () => void;
  status: PostStatus | undefined;
  pagesPublished: boolean;
  publication: AdminPublicationSearchResult | null;
}) {
  let { post: p, status, publication } = props;
  let pubBase = publication
    ? `/lish/${publication.identity_did}/${new AtUri(publication.uri).rkey}`
    : null;
  return (
    <div className="border-b border-border-light last:border-b-0">
      <div className="flex items-start gap-2 px-3 py-2">
        <Checkbox
          small
          checked={props.selected}
          onChange={(e) => props.onSelect(e.target.checked)}
        >
          <span className="flex flex-col gap-0.5 min-w-0 font-normal">
            <span className="text-primary">{p.title}</span>
            <span className="text-xs text-tertiary flex flex-wrap gap-x-2">
              <span className="font-mono">/{p.slug}</span>
              <Badge>{p.type}</Badge>
              {p.status !== "published" && <Badge warn>{p.status}</Badge>}
              {p.visibility !== "public" && <Badge warn>{p.visibility}</Badge>}
              {p.publishedAt && <span>{p.publishedAt.slice(0, 10)}</span>}
              {p.tags.length > 0 && <span>{p.tags.join(", ")}</span>}
            </span>
            {status && (
              <span className="text-xs flex flex-wrap gap-x-2">
                {status.state === "importing" && (
                  <span className="text-tertiary">Importing…</span>
                )}
                {status.state === "failed" && (
                  <span className="text-accent-1">Failed: {status.error}</span>
                )}
                {status.state === "done" && status.result.kind === "post" && (
                  <>
                    <ExternalLink href={`/${status.result.leafletId}`}>
                      Edit draft
                    </ExternalLink>
                    {status.result.rkey && pubBase && (
                      <ExternalLink href={`${pubBase}/${status.result.rkey}`}>
                        View post
                      </ExternalLink>
                    )}
                  </>
                )}
                {status.state === "done" &&
                  status.result.kind === "page" &&
                  pubBase && (
                    <>
                      <ExternalLink href={`${pubBase}/edit`}>
                        Edit pages
                      </ExternalLink>
                      {props.pagesPublished && (
                        <ExternalLink href={`${pubBase}${status.result.route}`}>
                          View page
                        </ExternalLink>
                      )}
                    </>
                  )}
              </span>
            )}
          </span>
        </Checkbox>
        <ButtonSecondary
          compact
          className="shrink-0"
          disabled={!props.canPreview}
          onClick={props.onTogglePreview}
        >
          {props.preview ? "Hide" : "Preview"}
        </ButtonSecondary>
      </div>
      {props.preview === "loading" && (
        <div className="px-3 pb-3">
          <DotLoader />
        </div>
      )}
      {props.preview && props.preview !== "loading" && (
        <div className="px-3 pb-3">
          <ImportPreview
            publication={publication}
            preview={{ ...props.preview, previewKey: props.preview.ghostId }}
          />
        </div>
      )}
    </div>
  );
}
