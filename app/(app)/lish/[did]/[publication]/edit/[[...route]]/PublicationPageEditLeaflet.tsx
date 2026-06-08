"use client";
import { Fact, PermissionToken, ReplicacheProvider } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { SelectionManager } from "components/SelectionManager";
import { EntitySetProvider } from "components/EntitySetProvider";
import { UpdateLeafletTitle } from "components/utils/UpdateLeafletTitle";
import { LeafletLayout } from "components/LeafletLayout";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { LeafletDirtyReporter } from "./LeafletDirtyReporter";
import { Page } from "components/Pages/Page";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { NewPublicationHeader } from "../../PublicationHeader";
import { PublicationPagesEditNav } from "./PublicationPagesEditNav";

export function PublicationPageEditLeaflet(props: {
  token: PermissionToken;
  initialFacts: Fact<Attribute>[];
  leaflet_id: string;
  did: string;
  publicationRecord: NormalizedPublication | null;
  publicationCreator: string;
  publicationUri: string;
  newsletterMode: boolean;
  pagePath: string;
  pageTitle: string;
}) {
  let record = props.publicationRecord;
  const iconUrl = record?.icon
    ? blobRefToSrc(record.icon.ref, props.did)
    : undefined;

  if (!record) return;

  return (
    <ReplicacheProvider
      rootEntity={props.leaflet_id}
      token={props.token}
      name={props.leaflet_id}
      initialFacts={props.initialFacts}
    >
      <EntitySetProvider
        set={props.token.permission_token_rights[0].entity_set}
      >
        <UpdateLeafletTitle entityID={props.leaflet_id} />
        <SelectionManager />
        <LeafletDirtyReporter
          leaflet_id={props.leaflet_id}
          publication_uri={props.publicationUri}
          path={props.pagePath}
          title={props.pageTitle}
        />
        <div
          className={`pubPageContent py-6 h-full ${
            !!record.theme?.showPageBackground && "mx-auto"
          }`}
        >
          <Page
            entityID={props.leaflet_id}
            fullPageScroll={!!!record.theme?.showPageBackground}
            header={
              <>
                <NewPublicationHeader
                  edit
                  iconUrl={iconUrl}
                  description={record?.description}
                  subscribe={{
                    publicationUri: props.publicationUri,
                    publicationUrl: record.url,
                    publicationName: record.name,
                    publicationDescription: record.description,
                    newsletterMode: props.newsletterMode,
                  }}
                />

                <PublicationPagesEditNav
                  did={props.did}
                  publicationName={record.name}
                />
                <div className="spacer h-3" />
              </>
            }
          />
        </div>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
