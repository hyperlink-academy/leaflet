"use client";

import { useState } from "react";
import { AtUri } from "@atproto/syntax";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Checkbox } from "components/Checkbox";
import { Input } from "components/Input";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import type { AdminPublicationSearchResult } from "actions/admin/importSubscribers";
import {
  listOffprintPosts,
  previewOffprintImport,
  importOffprintPost,
  type OffprintImportMode,
  type OffprintImportResult,
  type OffprintPost,
  type OffprintPostPreview as Preview,
  type OffprintPublication,
} from "actions/admin/importOffprint";
import { PublicationPicker } from "../PublicationPicker";
import { ImportPreview } from "./ImportPreview";
import {
  Badge,
  ExternalLink,
  ImportOptions,
  SelectAllHeader,
} from "./ImportShared";

const OFFPRINT_CONTENT = "app.offprint.content";

type PostStatus =
  | { state: "importing" }
  | { state: "done"; result: OffprintImportResult }
  | { state: "failed"; error: string };

export function AdminImportOffprint() {
  let toaster = useToaster();
  let [publication, setPublication] =
    useState<AdminPublicationSearchResult | null>(null);
  let [sourceUri, setSourceUri] = useState("");
  let [fetching, setFetching] = useState(false);
  let [source, setSource] = useState<OffprintPublication | null>(null);
  let [selected, setSelected] = useState<Set<string>>(new Set());
  let [mode, setMode] = useState<OffprintImportMode>("publish");
  let [showInDiscover, setShowInDiscover] = useState(false);
  let [previews, setPreviews] = useState<Map<string, Preview>>(new Map());
  let [expanded, setExpanded] = useState<string | null>(null);
  let [statuses, setStatuses] = useState<Map<string, PostStatus>>(new Map());
  let [importing, setImporting] = useState(false);

  let posts = source?.posts ?? [];
  let selectedPosts = posts.filter((p) => selected.has(p.uri));

  let fetchPosts = async () => {
    let uri = sourceUri.trim();
    if (!uri || fetching) return;
    setFetching(true);
    setSource(null);
    setSelected(new Set());
    setPreviews(new Map());
    setStatuses(new Map());
    setExpanded(null);
    let res = await listOffprintPosts({ publicationUri: uri });
    setFetching(false);
    if (!res.ok) {
      toaster({ type: "error", content: res.error });
      return;
    }
    setSource(res.value);
    setSelected(
      new Set(
        res.value.posts
          .filter((p) => p.contentType === OFFPRINT_CONTENT)
          .map((p) => p.uri),
      ),
    );
  };

  let togglePreview = async (post: OffprintPost) => {
    if (expanded === post.uri) return setExpanded(null);
    setExpanded(post.uri);
    if (previews.has(post.uri)) return;
    let res = await previewOffprintImport({ uri: post.uri });
    if (!res.ok) {
      toaster({ type: "error", content: res.error });
      setExpanded(null);
      return;
    }
    setPreviews((prev) => new Map(prev).set(post.uri, res.value));
  };

  let runImport = async () => {
    if (!publication || importing) return;
    setImporting(true);
    let next = new Map<string, PostStatus>();
    let failed = 0;
    // One post per request: each one fetches and uploads its images, so a
    // single call for the whole publication would outlive a server action.
    for (let post of selectedPosts) {
      setStatuses(new Map(next.set(post.uri, { state: "importing" })));
      let res = await importOffprintPost({
        uri: post.uri,
        publicationUri: publication.uri,
        mode,
        showInDiscover,
      });
      if (res.ok) next.set(post.uri, { state: "done", result: res.value });
      else {
        next.set(post.uri, { state: "failed", error: res.error });
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
      <div className="flex flex-col gap-3">
        <h3>Offprint publication</h3>
        <div className="input-with-border py-0! flex items-center gap-2 w-full">
          <Input
            className="appearance-none! grow outline-none! min-w-0 py-1! font-mono text-sm"
            placeholder="at://did:plc:…/site.standard.publication/…"
            value={sourceUri}
            onChange={(e) => setSourceUri(e.target.value)}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                fetchPosts();
              }
            }}
          />
          <ButtonSecondary
            compact
            type="button"
            disabled={!sourceUri.trim() || fetching}
            onClick={fetchPosts}
          >
            {fetching ? <DotLoader /> : "Fetch posts"}
          </ButtonSecondary>
        </div>
        {source && (
          <div className="text-xs text-tertiary flex flex-wrap gap-x-2">
            <span className="font-bold text-secondary">{source.name}</span>
            {source.url && (
              <ExternalLink href={source.url}>{source.url}</ExternalLink>
            )}
            <span>
              {posts.length} post{posts.length === 1 ? "" : "s"}
            </span>
            <span className="font-mono">{source.pds}</span>
          </div>
        )}
      </div>

      <PublicationPicker publication={publication} onChange={setPublication} />

      <ImportOptions
        mode={mode}
        onModeChange={setMode}
        showInDiscover={showInDiscover}
        onShowInDiscoverChange={setShowInDiscover}
        publishDescription="Each post is published as the owner under a new record key, backdated to its Offprint publish date. The Offprint records are left untouched."
        draftDescription="Posts appear in the publication's drafts for the owner to publish."
      />

      {source && posts.length > 0 && (
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
                    : new Set(posts.map((p) => p.uri)),
                )
              }
            />
            {posts.map((p) => (
              <PostRow
                key={p.uri}
                post={p}
                selected={selected.has(p.uri)}
                onSelect={(checked) => {
                  let next = new Set(selected);
                  if (checked) next.add(p.uri);
                  else next.delete(p.uri);
                  setSelected(next);
                }}
                preview={
                  expanded === p.uri ? previews.get(p.uri) ?? "loading" : null
                }
                onTogglePreview={() => togglePreview(p)}
                status={statuses.get(p.uri)}
                publication={publication}
              />
            ))}
          </div>
        </div>
      )}
      {source && posts.length === 0 && (
        <div className="text-sm text-tertiary">
          No documents on this PDS belong to that publication.
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
  post: OffprintPost;
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
  let unsupported = p.contentType !== OFFPRINT_CONTENT;
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
              {p.path && <span className="font-mono">{p.path}</span>}
              {unsupported && <Badge warn>{p.contentType}</Badge>}
              {p.publishedAt && <span>{p.publishedAt.slice(0, 10)}</span>}
              <span>
                {p.blockCount} block{p.blockCount === 1 ? "" : "s"}
              </span>
              {p.hasCoverImage && <span>cover image</span>}
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
          disabled={unsupported}
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
            preview={{ ...props.preview, previewKey: props.preview.sourceUri }}
          />
        </div>
      )}
    </div>
  );
}
