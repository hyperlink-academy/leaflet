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
  fetchSubstackPostMetadata,
  importSubstackPost,
  previewSubstackImport,
  type SubstackImportResult,
  type SubstackPostPreview as Preview,
} from "actions/admin/importSubstack";
import {
  parseSubstackExport,
  type SubstackExport,
  type SubstackPost,
} from "src/substackImport/parseSubstackExport";
import { applySubstackMetadata } from "src/substackImport/substackSite";
import { PublicationPicker } from "../PublicationPicker";
import { ImportPreview } from "./ImportPreview";
import {
  Badge,
  ExternalLink,
  ImportOptions,
  SelectAllHeader,
  type ImportMode,
  type PathMode,
} from "./ImportShared";

type PostStatus =
  | { state: "importing" }
  | { state: "done"; result: SubstackImportResult }
  | { state: "failed"; error: string };

type MetadataStatus =
  | { state: "fetching" }
  | { state: "fetched"; matched: number }
  | { state: "failed"; error: string };

export function AdminImportSubstack() {
  let toaster = useToaster();
  let [publication, setPublication] =
    useState<AdminPublicationSearchResult | null>(null);
  let [file, setFile] = useState<({ name: string } & SubstackExport) | null>(
    null,
  );
  let [siteUrl, setSiteUrl] = useState("");
  let [metadata, setMetadata] = useState<MetadataStatus | null>(null);
  let [selected, setSelected] = useState<Set<string>>(new Set());
  let [mode, setMode] = useState<ImportMode>("publish");
  let [pathMode, setPathMode] = useState<PathMode>("source");
  let [showInDiscover, setShowInDiscover] = useState(false);
  let [previews, setPreviews] = useState<Map<string, Preview>>(new Map());
  let [expanded, setExpanded] = useState<string | null>(null);
  let [statuses, setStatuses] = useState<Map<string, PostStatus>>(new Map());
  let [importing, setImporting] = useState(false);

  let posts = file?.posts ?? [];
  let published = posts.filter((p) => p.isPublished);
  let siteUrlValid = /^https?:\/\/\S+$/.test(siteUrl.trim());
  let selectedPosts = posts.filter((p) => selected.has(p.id));

  let fetchMetadata = async (url: string) => {
    setMetadata({ state: "fetching" });
    let res = await fetchSubstackPostMetadata({ siteUrl: url });
    if (!res.ok) return setMetadata({ state: "failed", error: res.error });
    let found = res.value;
    setFile((f) => f && { ...f, posts: applySubstackMetadata(f.posts, found) });
    setPreviews(new Map());
    setMetadata({
      state: "fetched",
      matched: published.filter((p) => found[p.id]).length,
    });
  };

  let onFile = async (f: File | undefined) => {
    setFile(null);
    setMetadata(null);
    setSelected(new Set());
    setPreviews(new Map());
    setStatuses(new Map());
    if (!f) return;
    try {
      let parsed = parseSubstackExport(new Uint8Array(await f.arrayBuffer()));
      setFile({ name: f.name, ...parsed });
      // Published posts are the default selection; drafts are opted into by
      // hand.
      setSelected(
        new Set(parsed.posts.filter((p) => p.isPublished).map((p) => p.id)),
      );
      if (parsed.subdomain)
        setSiteUrl(`https://${parsed.subdomain}.substack.com`);
    } catch (e) {
      toaster({ type: "error", content: String(e) });
    }
  };

  let togglePreview = async (post: SubstackPost) => {
    if (expanded === post.id) return setExpanded(null);
    setExpanded(post.id);
    if (previews.has(post.id)) return;
    let res = await previewSubstackImport({ post });
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
    let next = new Map<string, PostStatus>();
    let failed = 0;
    // One post per request: each one fetches and uploads its images, so a
    // single call for the whole export would outlive a server action.
    for (let post of selectedPosts) {
      setStatuses(new Map(next.set(post.id, { state: "importing" })));
      let res = await importSubstackPost({
        post,
        publicationUri: publication.uri,
        siteUrl: siteUrlValid ? siteUrl.trim() : null,
        mode,
        pathMode,
        showInDiscover,
      });
      if (res.ok) next.set(post.id, { state: "done", result: res.value });
      else {
        next.set(post.id, { state: "failed", error: res.error });
        failed++;
      }
      setStatuses(new Map(next));
    }
    setImporting(false);
    toaster({
      type: failed === 0 ? "success" : "error",
      content: `Imported ${selectedPosts.length - failed} of ${selectedPosts.length} posts to ${publication.name}`,
    });
  };

  return (
    <>
      <PublicationPicker publication={publication} onChange={setPublication} />

      <div className="flex flex-col gap-3">
        <h3>Substack export</h3>
        <div className="text-tertiary text-sm leading-snug">
          Settings → Import/Export → Export your data. The zip is read in the
          browser; only the posts are used. Subscribers are imported separately,
          from the email_list CSV inside it. Posts for paid subscribers are
          placed behind a members-only delimiter.
        </div>
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {file && (
          <div className="text-xs text-tertiary">
            <span className="font-mono">{file.name}</span> · {published.length}{" "}
            published posts, {posts.length - published.length} drafts
            {file.emptyDrafts > 0 &&
              ` (${file.emptyDrafts} empty drafts left out)`}
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">
            Substack site URL — the export has no cover images or tags; they can
            be read from the live site while it&apos;s still up
          </span>
          <div className="flex gap-2">
            <Input
              className="input-with-border grow"
              placeholder="https://example.substack.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
            <ButtonSecondary
              className="shrink-0"
              disabled={
                !file || !siteUrlValid || metadata?.state === "fetching"
              }
              onClick={() => fetchMetadata(siteUrl.trim())}
            >
              Fetch covers and tags
            </ButtonSecondary>
          </div>
        </label>
        {metadata && (
          <div className="text-xs">
            {metadata.state === "fetching" && (
              <span className="text-tertiary">Reading the site…</span>
            )}
            {metadata.state === "fetched" && (
              <span className="text-tertiary">
                Found {metadata.matched} of {published.length} published posts
                on the site.
              </span>
            )}
            {metadata.state === "failed" && (
              <span className="text-accent-1">{metadata.error}</span>
            )}
          </div>
        )}
      </div>

      <ImportOptions
        mode={mode}
        onModeChange={setMode}
        pathMode={pathMode}
        onPathModeChange={setPathMode}
        showInDiscover={showInDiscover}
        onShowInDiscoverChange={setShowInDiscover}
        publishDescription="Each published post is published as the owner, backdated to its Substack date. Substack drafts stay drafts."
        draftDescription="Posts appear in the publication's drafts for the owner to publish."
        sourcePathDescription="Posts keep their Substack slug, without the /p: /p/my-post becomes /my-post."
        leafletPathDescription="Posts get a fresh record key, like /3mvj2xk5qzc2a."
      />

      {posts.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3>Posts</h3>
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
                onTogglePreview={() => togglePreview(p)}
                status={statuses.get(p.id)}
                publication={publication}
              />
            ))}
          </div>
        </div>
      )}

      <ButtonPrimary
        className="self-start"
        disabled={!publication || selectedPosts.length === 0 || importing}
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
  post: SubstackPost;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  preview: Preview | "loading" | null;
  onTogglePreview: () => void;
  status: PostStatus | undefined;
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
              {p.type !== "newsletter" && <Badge>{p.type}</Badge>}
              {!p.isPublished && <Badge warn>draft</Badge>}
              {p.audience !== "everyone" && <Badge warn>{p.audience}</Badge>}
              {p.publishedAt && <span>{p.publishedAt.slice(0, 10)}</span>}
              {p.coverImage && <span>cover</span>}
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
                {status.state === "done" && (
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
              </span>
            )}
          </span>
        </Checkbox>
        <ButtonSecondary
          compact
          className="shrink-0"
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
            preview={{
              ...props.preview,
              previewKey: props.preview.substackId,
            }}
          />
        </div>
      )}
    </div>
  );
}
