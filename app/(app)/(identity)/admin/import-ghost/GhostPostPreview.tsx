"use client";

import { useMemo, type ContextType } from "react";
import { ReplicacheProvider, type PermissionToken } from "src/replicache";
import { EntitySetProvider } from "components/EntitySetProvider";
import { StaticLeafletDataContext } from "components/PageSWRDataProvider";
import { Block } from "components/Blocks/Block";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { localImages } from "src/utils/addImage";
import type { AdminPublicationSearchResult } from "actions/admin/importSubscribers";
import type { GhostPostPreview as Preview } from "actions/admin/importGhost";

const PREVIEW_SET = "ghost-import-preview";

// Renders a planned import the way the editor shows a draft: the real block
// components over the plan's facts, with no Replicache instance behind them —
// the same read-only setup the home page's leaflet cards use.
export function GhostPostPreview(props: {
  publication: AdminPublicationSearchResult | null;
  preview: Preview;
}) {
  let { publication, preview } = props;
  let token = useMemo<PermissionToken>(
    () => ({
      id: `ghost-import-preview-${preview.ghostId}`,
      root_entity: preview.rootEntityId,
      permission_token_rights: [
        {
          token: `ghost-import-preview-${preview.ghostId}`,
          entity_set: PREVIEW_SET,
          created_at: "",
          read: true,
          write: false,
          create_token: false,
          change_entity_set: false,
        },
      ],
    }),
    [preview.ghostId, preview.rootEntityId],
  );
  // Blocks that show publication context (subscribe, members-only delimiter)
  // read it from the leaflet data; without this they'd fetch it by token id.
  let leafletData = useMemo(
    () =>
      ({
        ...token,
        title: preview.title,
        description: preview.description,
        leaflets_in_publications: publication
          ? [
              {
                publication: publication.uri,
                leaflet: token.id,
                doc: null,
                title: preview.title,
                description: preview.description,
                tags: preview.tags,
                publications: { ...publication, record: null },
              },
            ]
          : [],
        leaflets_to_documents: [],
        publications: [],
        blocked_by_admin: null,
        custom_domain_routes: [],
      }) as unknown as ContextType<typeof StaticLeafletDataContext>,
    [token, preview, publication],
  );
  // ImageBlock serves stored images through the Supabase resize proxy, which
  // can't fetch Ghost-hosted URLs; images registered as local render as-is.
  useMemo(() => {
    for (let f of preview.facts)
      if (f.data.type === "image") localImages.set(f.data.src, f.data.src);
  }, [preview.facts]);

  return (
    <ReplicacheProvider
      initialFactsOnly
      disablePull
      rootEntity={preview.rootEntityId}
      token={token}
      name={token.id}
      initialFacts={preview.facts}
    >
      <EntitySetProvider set={PREVIEW_SET}>
        <StaticLeafletDataContext value={leafletData}>
          <div className="bg-bg-leaflet w-full overflow-x-auto py-4 px-2 rounded-md">
            <div className="bg-bg-page border border-border-light rounded-md px-3 sm:px-4 py-4 max-w-prose mx-auto flex flex-col gap-2">
              {preview.coverImageUrl && (
                <img
                  src={preview.coverImageUrl}
                  alt=""
                  className="rounded-md w-full"
                />
              )}
              <h1>{preview.title}</h1>
              {preview.description && (
                <p className="text-secondary">{preview.description}</p>
              )}
              <PreviewBlocks pageId={preview.firstPageId} />
            </div>
          </div>
        </StaticLeafletDataContext>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}

function PreviewBlocks(props: { pageId: string }) {
  let blocks = useBlocks(props.pageId);
  return (
    <div className="flex flex-col">
      {blocks.map((b, i, arr) => (
        <Block
          key={b.factID}
          {...b}
          preview
          pageType="doc"
          previousBlock={arr[i - 1] || null}
          nextBlock={arr[i + 1] || null}
          nextPosition={null}
        />
      ))}
    </div>
  );
}
