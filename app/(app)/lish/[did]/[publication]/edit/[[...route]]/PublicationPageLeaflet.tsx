"use client";
import { Fact, PermissionToken, ReplicacheProvider } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { SelectionManager } from "components/SelectionManager";
import { Pages } from "components/Pages";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { EntitySetProvider } from "components/EntitySetProvider";
import { UpdateLeafletTitle } from "components/utils/UpdateLeafletTitle";
import { LeafletLayout } from "components/LeafletLayout";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { Json } from "supabase/database.types";
import { LeafletDirtyReporter } from "./LeafletDirtyReporter";

export function PublicationPageLeaflet(props: {
  token: PermissionToken;
  initialFacts: Fact<Attribute>[];
  leaflet_id: string;
  publicationRecord: Json | null;
  publicationCreator: string;
  publicationUri: string;
  pagePath: string;
  pageTitle: string;
}) {
  let normalizedPub = normalizePublicationRecord(props.publicationRecord);
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
        <PublicationThemeProvider
          record={normalizedPub}
          pub_creator={props.publicationCreator}
        >
          <PublicationBackgroundProvider
            record={normalizedPub}
            pub_creator={props.publicationCreator}
          >
            <UpdateLeafletTitle entityID={props.leaflet_id} />
            <SelectionManager />
            <LeafletDirtyReporter
              leaflet_id={props.leaflet_id}
              publication_uri={props.publicationUri}
              path={props.pagePath}
              title={props.pageTitle}
            />
            <LeafletLayout className="!pb-6">
              <Pages rootPage={props.leaflet_id} />
            </LeafletLayout>
          </PublicationBackgroundProvider>
        </PublicationThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
