"use client";
import {
  Fact,
  PermissionToken,
  ReplicacheProvider,
  useEntity,
} from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { SelectionManager } from "components/SelectionManager";
import { EntitySetProvider } from "components/EntitySetProvider";
import { UpdateLeafletTitle } from "components/utils/UpdateLeafletTitle";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { Page } from "components/Pages/Page";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { NewPublicationHeader } from "../../PublicationHeader";
import { PublicationPagesEditNav } from "./PublicationPagesEditNav";
import { useCardBorderHiddenContext } from "components/ThemeManager/ThemeProvider";

export function PublicationPageEditLeaflet(props: {
  token: PermissionToken;
  initialFacts: Fact<Attribute>[];
  leaflet_id: string;
  did: string;
  publicationRecord: NormalizedPublication | null;
  publicationCreator: string;
  publicationUri: string;
  newsletterMode: boolean;
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
        <PublicationPageEditContent
          leaflet_id={props.leaflet_id}
          did={props.did}
          record={record}
          iconUrl={iconUrl}
          publicationUri={props.publicationUri}
          newsletterMode={props.newsletterMode}
        />
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}

function PublicationPageEditContent(props: {
  leaflet_id: string;
  did: string;
  record: NonNullable<NormalizedPublication>;
  iconUrl: string | undefined;
  publicationUri: string;
  newsletterMode: boolean;
}) {
  let { record } = props;
  let rootPage = useEntity(props.leaflet_id, "root/page")[0];
  let firstPage = rootPage?.data.value || props.leaflet_id;
  let narrowPage = record.theme?.pageWidth && record.theme.pageWidth < 480;
  let hideSubscribeInHeader = !narrowPage;
  // Read from the live theme context so the layout responds to page-background
  // toggles in the theme editor, not just the saved record.
  let cardBorderHidden = useCardBorderHiddenContext();
  let showPageBackground = !cardBorderHidden;

  return (
    <div
      className={`pubPageContent py-6 h-full ${
        showPageBackground && "mx-auto"
      }`}
    >
      <Page
        entityID={firstPage}
        fullPageScroll={!showPageBackground}
        header={
          <>
            <NewPublicationHeader
              edit
              hideSubscribeInHeader={hideSubscribeInHeader}
              iconUrl={props.iconUrl}
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
              hideSubscribeInHeader={hideSubscribeInHeader}
            />
            <div className="spacer h-3" />
          </>
        }
      />
    </div>
  );
}
