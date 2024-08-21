"use client";

import { useEffect, useState } from "react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity } from "src/replicache";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { focusBlock } from "components/Blocks";
import { useIsMobile } from "src/hooks/isMobile";

export function UpdatePageTitle(props: { entityID: string }) {
  let blocks = useBlocks(props.entityID).filter(
    (b) => b.type === "text" || b.type === "heading",
  );
  let firstBlock = blocks[0];
  let title = usePageTitle(props.entityID);
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);
  let params = useSearchParams();
  let focusFirstBlock = params.get("focusFirstBlock");
  let router = useRouter();
  let isMobile = useIsMobile();
  useEffect(() => {
    if (isMobile) return;
    if (!firstBlock || focusFirstBlock === null) return;

    router.replace(location.pathname);
    setTimeout(() => {
      focusBlock(firstBlock, { type: "start" });
      //remove url param
    }, 100);
  }, [focusFirstBlock, firstBlock, router, isMobile]);

  return null;
}

export const usePageTitle = (entityID: string) => {
  let [title, setTitle] = useState("");
  let blocks = useBlocks(entityID).filter(
    (b) => b.type === "text" || b.type === "heading",
  );
  let firstBlock = blocks[0];
  let content = useEntity(firstBlock?.value, "block/text");
  useEffect(() => {
    if (content) {
      let doc = new Y.Doc();
      const update = base64.toByteArray(content.data.value);
      Y.applyUpdate(doc, update);
      let nodes = doc.getXmlElement("prosemirror").toArray();
      setTitle(YJSFragmentToString(nodes[0]) || "Untitled Leaflet");
    }
  }, [content]);
  return title;
};
