"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useIdentityData } from "components/IdentityProvider";
import { useEntity, useReplicache } from "src/replicache";
import { getHomeDocs } from "src/utils/homeDocsStorage";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEditorStates } from "src/state/useEditorState";
import {
  useActivateCustomizeTutorial,
  useCustomizeTutorial,
} from "app/(app)/(identity)/lish/[did]/[publication]/edit/CustomizeTutorialTooltip";

const TEXT_TOOLTIP_DONE_KEY = "leafletTextTutorialDone";

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

  // New docs start with a single empty text block, which doesn't count.
  let blocks = useBlocks(firstPage);
  let hasDocContent = useEditorStates(
    (s) =>
      blocks.length > 1 ||
      blocks.some(
        (b) =>
          (b.type !== "text" && b.type !== "heading") ||
          !!s.editorStates[b.entityID]?.editor.doc.textContent,
      ),
  );

  let [textDone, setTextDone] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(TEXT_TOOLTIP_DONE_KEY) === "true",
  );
  let textClosed = useCustomizeTutorial((s) => s.dismissed.includes("text"));
  let finishText = pageType === "doc" && (textClosed || hasDocContent);
  useEffect(() => {
    if (!finishText || textDone) return;
    window.localStorage.setItem(TEXT_TOOLTIP_DONE_KEY, "true");
    setTextDone(true);
  }, [finishText, textDone]);

  useActivateCustomizeTutorial(
    loaded &&
      !hasOtherDocs &&
      (pageType === "canvas" || (!hasDocContent && !textDone)),
    pageType === "canvas" ? ["canvas-add"] : ["text"],
    pub
      ? {}
      : {
          text: `Click the +, or type "/" to add images, embeds, subpages, and more.`,
        },
  );
  return null;
}
