"use client";

import { Fact, PermissionToken, ReplicacheProvider } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { scanIndexLocal } from "src/replicache/utils";
import { Pages } from "components/Pages";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { EntitySetProvider } from "components/EntitySetProvider";
import { LeafletLayout } from "components/LeafletLayout";
import { StaticLeafletDataContext } from "components/PageSWRDataProvider";
import type { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { FloatingVersionBanner } from "components/VersionBanner";
import { SavedVersionContext } from "components/SavedVersionContext";

export function VersionViewer(props: {
  token: PermissionToken;
  facts: Fact<Attribute>[];
  version: { id: string; name: string | null; created_at: string };
  canModify: boolean;
  staticLeafletData: Exclude<GetLeafletDataReturnType["result"]["data"], null>;
  initialHeadingFontId?: string;
  initialBodyFontId?: string;
}) {
  let rootEntity = props.token.root_entity;
  let scan = scanIndexLocal(props.facts);
  let firstPage =
    scan.eav(rootEntity, "root/page")[0]?.data.value || rootEntity;
  let firstPageType = scan.eav(firstPage, "page/type")[0]?.data.value || "doc";

  return (
    <ReplicacheProvider
      rootEntity={rootEntity}
      token={props.token}
      name={`version-${props.version.id}`}
      initialFacts={props.facts}
      initialFactsOnly
    >
      <StaticLeafletDataContext.Provider value={props.staticLeafletData}>
        <EntitySetProvider
          set={props.token.permission_token_rights[0].entity_set}
        >
          <ThemeProvider
            entityID={rootEntity}
            initialHeadingFontId={props.initialHeadingFontId}
            initialBodyFontId={props.initialBodyFontId}
          >
            <ThemeBackgroundProvider entityID={rootEntity}>
              <SavedVersionContext.Provider
                value={{
                  name: props.version.name,
                  savedAt: props.version.created_at,
                  tokenId: props.token.id,
                  versionId: props.version.id,
                  canModify: props.canModify,
                }}
              >
                {firstPageType === "canvas" && <FloatingVersionBanner />}
                <LeafletLayout className="!pb-[64px] sm:!pb-6">
                  <Pages rootPage={rootEntity} />
                </LeafletLayout>
              </SavedVersionContext.Provider>
            </ThemeBackgroundProvider>
          </ThemeProvider>
        </EntitySetProvider>
      </StaticLeafletDataContext.Provider>
    </ReplicacheProvider>
  );
}
