"use client";

import useSWR from "swr";
import { useIdentityData } from "components/IdentityProvider";
import { useEntity, useReplicache } from "src/replicache";
import { getHomeDocs } from "src/utils/homeDocsStorage";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useActivateCustomizeTutorial } from "app/(app)/(identity)/lish/[did]/[publication]/edit/CustomizeTutorialTooltip";

export function LeafletTutorial(props: { rootPage: string }) {
  let { permission_token } = useReplicache();
  let { identity, identityPending } = useIdentityData();
  let { data: localLeaflets } = useSWR("leaflets", () => getHomeDocs());
  let { data: pub } = useLeafletPublicationData();
  let firstPage =
    useEntity(props.rootPage, "root/page")[0]?.data.value || props.rootPage;
  let pageType = useEntity(firstPage, "page/type")?.data.value || "doc";

  let hasOtherDocs = identity
    ? identity.permission_token_on_homepage.some(
        (p) => p.permission_tokens.id !== permission_token.id,
      ) ||
      !!identity.contributor_leaflets?.some(
        (c) => c.permission_tokens.id !== permission_token.id,
      )
    : !!localLeaflets?.some(
        (d) => !d.hidden && d.token.id !== permission_token.id,
      );
  let loaded = identity
    ? true
    : !identityPending && localLeaflets !== undefined;

  useActivateCustomizeTutorial(
    loaded && !hasOtherDocs,
    pageType === "canvas" ? ["canvas-add"] : ["text"],
    pub
      ? {}
      : {
          text: `Click the +, or type "/" to add images, embeds, subpages, and more.`,
        },
  );
  return null;
}
