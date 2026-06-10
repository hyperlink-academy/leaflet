"use client";
import { useMemo, useState, type CSSProperties } from "react";
import {
  Fact,
  PermissionToken,
  ReplicacheProvider,
  useEntity,
} from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { SelectionManager } from "components/SelectionManager";
import { EntitySetProvider } from "components/EntitySetProvider";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { Page } from "components/Pages/Page";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { NewPublicationHeader } from "../PublicationHeader";
import { PublicationPagesEditNav } from "./PublicationPagesEditNav";
import { PublicationEditHeader } from "./PublicationEditHeader";
import {
  LeafletThemeProvider,
  useCardBorderHiddenContext,
} from "components/ThemeManager/ThemeProvider";
import { usePublicationNavEntries } from "./usePublicationNavEntries";

export function PublicationDraftEditor(props: {
  token: PermissionToken;
  initialFacts: Fact<Attribute>[];
  leaflet_id: string;
  did: string;
  publicationName: string;
  publicationRecord: NormalizedPublication | null;
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
        <SelectionManager />
        <LeafletThemeProvider entityID={props.leaflet_id} local>
          <div className="flex flex-col h-full w-full bg-accent-1">
            <PublicationEditHeader
              did={props.did}
              publicationName={props.publicationName}
            />
            <div className="pubWrapper publicationScrollContainer editorScrollRoot flex flex-col grow min-h-0 bg-bg-page rounded-t-lg overflow-y-auto ">
              <DraftLeafletBackground
                entityID={props.leaflet_id}
                className="h-full flex items-stretch place-items-center"
              >
                <PublicationDraftEditorContent
                  leaflet_id={props.leaflet_id}
                  did={props.did}
                  record={record}
                  iconUrl={iconUrl}
                  publicationUri={props.publicationUri}
                  newsletterMode={props.newsletterMode}
                />
              </DraftLeafletBackground>
            </div>
          </div>
        </LeafletThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}

function DraftLeafletBackground(props: {
  entityID: string;
  className?: string;
  children: React.ReactNode;
}) {
  let backgroundImage = useEntity(props.entityID, "theme/background-image");
  let backgroundImageRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );
  return (
    <div
      className={`PubBackgroundWrapper w-full bg-bg-leaflet text-primary h-full flex flex-col bg-cover bg-center bg-no-repeat items-stretch ${props.className || ""}`}
      style={
        {
          backgroundImage: backgroundImage
            ? `url(${backgroundImage.data.src}), url(${backgroundImage.data.fallback})`
            : undefined,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: backgroundImageRepeat
            ? `${backgroundImageRepeat.data.value}px`
            : "cover",
        } as CSSProperties
      }
    >
      {props.children}
    </div>
  );
}

function PublicationDraftEditorContent(props: {
  leaflet_id: string;
  did: string;
  record: NonNullable<NormalizedPublication>;
  iconUrl: string | undefined;
  publicationUri: string;
  newsletterMode: boolean;
}) {
  let { record } = props;
  let entries = usePublicationNavEntries();
  let [selectedPage, setSelectedPage] = useState<string | null>(null);
  let currentPage = useMemo(() => {
    if (selectedPage && entries.some((e) => e.entity === selectedPage))
      return selectedPage;
    let home = entries.find((e) => e.route === "/");
    return home?.entity ?? entries.find((e) => !e.externalUrl)?.entity ?? null;
  }, [selectedPage, entries]);

  let pageWidth = useEntity(props.leaflet_id, "theme/page-width")?.data.value;
  let narrowPage = pageWidth && pageWidth < 480;
  let hideSubscribeInHeader = !narrowPage;
  // Read from the live theme context so the layout responds to page-background
  // toggles in the theme editor.
  let cardBorderHidden = useCardBorderHiddenContext();
  let showPageBackground = !cardBorderHidden;

  if (!currentPage) return null;

  return (
    <div
      className={`pubPageContent py-6 h-full ${
        showPageBackground && "mx-auto"
      }`}
    >
      <Page
        key={currentPage}
        entityID={currentPage}
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
              publicationUrl={record.url}
              hideSubscribeInHeader={hideSubscribeInHeader}
              subscribe={{
                publicationUri: props.publicationUri,
                publicationUrl: record.url,
                publicationName: record.name,
                publicationDescription: record.description,
                newsletterMode: props.newsletterMode,
              }}
              selectedPage={currentPage}
              onSelectPage={setSelectedPage}
            />
            <div className="spacer h-3" />
          </>
        }
      />
    </div>
  );
}
