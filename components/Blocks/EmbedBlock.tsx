import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps, BlockLayout } from "./Block";
import { v7 } from "uuid";
import { useSmoker } from "components/Toast";
import { Separator } from "components/Layout";
import { Input } from "components/Input";
import { isUrl } from "src/utils/isURL";
import { elementId } from "src/utils/elementId";
import { focusBlock } from "src/utils/focusBlock";
import { useDrag } from "src/hooks/useDrag";
import { BlockEmbedSmall } from "components/Icons/BlockEmbedSmall";
import { CheckTiny } from "components/Icons/CheckTiny";
import { DotLoader } from "components/utils/DotLoader";
import {
  LinkPreviewBody,
  LinkPreviewMetadataResult,
} from "app/api/link_previews/route";
import { getAspectRatio } from "src/utils/aspectRatio";
import { useIframeChannel } from "src/hooks/useIframeChannel";
import { scrollIntoView } from "src/utils/scrollIntoView";
import { EmbedBlockData } from "src/partsPageChannel";
import { useColorAttribute } from "components/ThemeManager/useColorAttribute";
import {
  assertStandardSitePostFacts,
  assertStandardSitePublicationFacts,
} from "src/utils/addLinkBlock";
import { ToggleGroup } from "components/ToggleGroup";
import { srcDocSandbox } from "src/utils/srcDocSandbox";

export const EmbedBlock = (props: BlockProps & { preview?: boolean }) => {
  let entity_set = useEntitySetContext();
  let { permissions } = entity_set;
  let { rep, undoManager } = useReplicache();
  let url = useEntity(props.entityID, "embed/url");
  let html = useEntity(props.entityID, "embed/html");
  let isCanvasBlock = props.pageType === "canvas";

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let height = useEntity(props.entityID, "embed/height")?.data.value || 360;
  let aspectRatio = useEntity(props.entityID, "embed/aspect-ratio")?.data.value;

  let heightOnDragEnd = useCallback(
    (dragPosition: { x: number; y: number }) => {
      rep?.mutate.assertFact({
        entity: props.entityID,
        attribute: "embed/height",
        data: {
          type: "number",
          value: height + dragPosition.y,
        },
      });
    },
    [props, rep, height],
  );

  let heightHandle = useDrag({ onDragEnd: heightOnDragEnd });

  let resizeHandle =
    !props.preview && permissions.write && !aspectRatio ? (
      <div
        data-draggable
        className={`resizeHandle
          cursor-ns-resize shrink-0 z-10 w-6 h-[5px]
          absolute bottom-[3px] right-1/2 translate-x-1/2
          rounded-full bg-white  border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,inset_0_0_0_1px_white]
          ${isCanvasBlock ? "hidden group-hover/canvas-block:block" : ""}`}
        {...heightHandle.handlers}
      />
    ) : null;

  let assertBlockData = useCallback(
    async (entityID: string, block: EmbedBlockData) => {
      if (!rep) return;
      if (block.type === "text") {
        await rep.mutate.assertFact([
          {
            entity: entityID,
            attribute: "block/type",
            data: { type: "block-type-union", value: "text" },
          },
          {
            entity: entityID,
            attribute: "block/text",
            data: { type: "text", value: block.content },
          },
        ]);
      } else {
        let facts: Parameters<typeof rep.mutate.assertFact>[0] = [
          {
            entity: entityID,
            attribute: "block/type",
            data: { type: "block-type-union", value: "embed" },
          },
          {
            entity: entityID,
            attribute: "embed/url",
            data: { type: "string", value: block.url },
          },
        ];
        if (block.aspectRatio) {
          facts.push({
            entity: entityID,
            attribute: "embed/aspect-ratio",
            data: { type: "string", value: block.aspectRatio },
          });
        } else if (block.height) {
          facts.push({
            entity: entityID,
            attribute: "embed/height",
            data: { type: "number", value: block.height },
          });
        }
        await rep.mutate.assertFact(facts);
      }
    },
    [rep],
  );

  let { iframeRef } = useIframeChannel({
    onOpen: (openUrl) => {
      useUIState
        .getState()
        .openPage(props.parent, { type: "iframe", url: openUrl });
      scrollIntoView(`iframe-page-${openUrl}`, 0.8);
    },
    onReplaceWith: (block) => {
      assertBlockData(props.entityID, block);
    },
    onAddBelow: async (block) => {
      await undoManager.withUndoGroup(async () => {
        if (!rep) return;
        let newEntityID = v7();
        await rep.mutate.addBlock({
          permission_set: entity_set.set,
          factID: v7(),
          parent: props.parent,
          type: block.type === "text" ? "text" : "card",
          position: generateKeyBetween(props.position, props.nextPosition),
          newEntityID,
        });
        await assertBlockData(newEntityID, block);
      });
    },
  });

  useEffect(() => {
    if (props.preview) return;
    let input = document.getElementById(elementId.block(props.entityID).input);
    if (isSelected) {
      input?.focus();
    } else input?.blur();
  }, [isSelected, props.entityID, props.preview]);

  let bgPage = useColorAttribute(null, "theme/page-background");
  let primary = useColorAttribute(null, "theme/primary");
  let iframeSrc = useMemo(() => {
    if (!url) return undefined;
    let src = new URL(url.data.value);
    src.searchParams.set("parts.page.embed.ctx.mode", "edit");
    src.searchParams.set(
      "parts.page.embed.ctx.bgColor",
      bgPage.toString("hex"),
    );
    src.searchParams.set(
      "parts.page.embed.ctx.primaryColor",
      primary.toString("hex"),
    );
    return src.toString();
  }, [url, bgPage, primary]);

  // check if URL is a YouTube link, so we can set the appropriate referrer policy
  // to avoid YT config "Error 153" since they're strict about requiring a valid referer header
  let isYouTube =
    iframeSrc?.includes("youtube.com") || iframeSrc?.includes("youtu.be");

  if (props.preview) return null;
  if (!url && !html) {
    if (!permissions.write) return null;
    return (
      <div
        className={`w-full ${!aspectRatio && heightHandle.dragDelta ? "pointer-events-none" : ""}`}
      >
        <label
          id={props.preview ? undefined : elementId.block(props.entityID).input}
          htmlFor={embedInputId(props.entityID)}
          className={`
            w-full p-2
            text-tertiary hover:text-accent-contrast hover:cursor-pointer
            flex flex-auto gap-2 items-center justify-center hover:border-2 border-dashed rounded-lg
            ${isSelected ? "border-2 border-tertiary" : "border border-border"}
            ${props.pageType === "canvas" && "bg-bg-page"}`}
          style={
            aspectRatio
              ? { aspectRatio }
              : { height: height + (heightHandle.dragDelta?.y || 0) }
          }
          onMouseDown={() => {
            focusBlock(
              { type: props.type, value: props.entityID, parent: props.parent },
              { type: "start" },
            );
          }}
        >
          <BlockEmbedInput {...props} />
        </label>
        {resizeHandle}
      </div>
    );
  }

  return (
    <div
      className={`w-full ${!aspectRatio && heightHandle.dragDelta ? "pointer-events-none" : ""}`}
    >
      <BlockLayout
        isSelected={!!isSelected}
        className="flex flex-col relative w-full overflow-hidden group/embedBlock p-0!"
      >
        {html ? (
          <iframe
            className="w-full"
            style={{ height: height + (heightHandle.dragDelta?.y || 0) }}
            srcDoc={html.data.value}
            sandbox={srcDocSandbox}
            allow="fullscreen"
            loading="lazy"
            referrerPolicy="no-referrer"
          ></iframe>
        ) : (
          <iframe
            ref={iframeRef}
            className={aspectRatio ? "w-full h-auto" : "w-full"}
            style={
              aspectRatio
                ? { aspectRatio }
                : { height: height + (heightHandle.dragDelta?.y || 0) }
            }
            src={iframeSrc}
            allow="fullscreen"
            loading="lazy"
            referrerPolicy={
              isYouTube ? "strict-origin-when-cross-origin" : "no-referrer"
            }
          ></iframe>
        )}
      </BlockLayout>

      {resizeHandle}
    </div>
  );
};

const embedInputId = (entityID: string) => `${entityID}-embed-input`;

const BlockEmbedInput = (props: BlockProps) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let entity_set = useEntitySetContext();
  let [mode, setMode] = useState<"url" | "html">("url");
  let [linkValue, setLinkValue] = useState("");
  let [htmlValue, setHtmlValue] = useState("");
  let [loading, setLoading] = useState(false);
  let { rep, undoManager } = useReplicache();

  let aspectRatioFact = useEntity(props.entityID, "embed/aspect-ratio");
  let heightFact = useEntity(props.entityID, "embed/height");
  // The user explicitly sized the block (preset or drag) — submits shouldn't
  // overwrite that with metadata or defaults.
  let hasExplicitSize = !!aspectRatioFact || !!heightFact;

  let setAspectRatio = (value: "fixed" | "4/3" | "1/1" | "4/1") => {
    if (!rep) return;
    if (value === "fixed") {
      if (aspectRatioFact)
        rep.mutate.retractFact({ factID: aspectRatioFact.id });
      return;
    }
    rep.mutate.assertFact({
      entity: props.entityID,
      attribute: "embed/aspect-ratio",
      data: { type: "string", value },
    });
  };

  let submitUrl = async () => {
    await undoManager.withUndoGroup(async () => {
      let entity = props.entityID;
      if (!entity) {
        entity = v7();

        await rep?.mutate.addBlock({
          permission_set: entity_set.set,
          factID: v7(),
          parent: props.parent,
          type: "card",
          position: generateKeyBetween(props.position, props.nextPosition),
          newEntityID: entity,
        });
      }
      let link = linkValue;
      if (!linkValue.startsWith("http")) link = `https://${linkValue}`;
      if (!rep) return;

      // Try to get embed URL from iframely, fallback to direct URL
      setLoading(true);
      try {
        let res = await fetch("/api/link_previews", {
          headers: { "Content-Type": "application/json" },
          method: "POST",
          body: JSON.stringify({ url: link, type: "meta" } as LinkPreviewBody),
        });

        let embedUrl = link;
        let embedHeight = 360;
        let embedAspectRatio: string | null = null;

        if (res.status === 200) {
          let data = await (res.json() as LinkPreviewMetadataResult);
          if (data.leafletPost) {
            await assertStandardSitePostFacts(rep, entity, data.leafletPost.uri);
            setLoading(false);
            return;
          }
          if (data.leafletPublication) {
            await assertStandardSitePublicationFacts(
              rep,
              entity,
              data.leafletPublication.uri,
            );
            setLoading(false);
            return;
          }
          if (data.success && data.data.links?.player?.[0]) {
            let embed = data.data.links.player[0];
            embedUrl = embed.href;
            embedHeight = embed.media?.height || 300;
            embedAspectRatio = getAspectRatio(embed.media);
          }
        }

        let facts: Parameters<typeof rep.mutate.assertFact>[0] = [
          {
            entity: entity,
            attribute: "embed/url",
            data: {
              type: "string",
              value: embedUrl,
            },
          },
        ];
        if (!hasExplicitSize) {
          if (embedAspectRatio) {
            facts.push({
              entity: entity,
              attribute: "embed/aspect-ratio",
              data: {
                type: "string",
                value: embedAspectRatio,
              },
            });
          } else {
            facts.push({
              entity: entity,
              attribute: "embed/height",
              data: {
                type: "number",
                value: embedHeight,
              },
            });
          }
        }
        await rep.mutate.assertFact(facts);
      } catch {
        // On any error, fallback to using the URL directly
        await rep.mutate.assertFact([
          {
            entity: entity,
            attribute: "embed/url",
            data: {
              type: "string",
              value: link,
            },
          },
        ]);
      } finally {
        setLoading(false);
      }

      let textEntity = v7();
      await rep.mutate.addBlock({
        permission_set: entity_set.set,
        factID: v7(),
        parent: props.parent,
        type: "text",
        position: generateKeyBetween(props.position, props.nextPosition),
        newEntityID: textEntity,
      });

      focusBlock(
        {
          value: textEntity,
          type: "text",
          parent: props.parent,
        },
        { type: "start" },
      );
    });
  };

  let submitHtml = async () => {
    await undoManager.withUndoGroup(async () => {
      if (!rep) return;
      setLoading(true);
      try {
        let entity = props.entityID;
        if (!entity) {
          entity = v7();

          await rep.mutate.addBlock({
            permission_set: entity_set.set,
            factID: v7(),
            parent: props.parent,
            type: "card",
            position: generateKeyBetween(props.position, props.nextPosition),
            newEntityID: entity,
          });
        }
        let facts: Parameters<typeof rep.mutate.assertFact>[0] = [
          {
            entity,
            attribute: "embed/html",
            data: { type: "string", value: htmlValue },
          },
        ];
        if (!hasExplicitSize) {
          facts.push({
            entity,
            attribute: "embed/height",
            data: { type: "number", value: 360 },
          });
        }
        await rep.mutate.assertFact(facts);

        let textEntity = v7();
        await rep.mutate.addBlock({
          permission_set: entity_set.set,
          factID: v7(),
          parent: props.parent,
          type: "text",
          position: generateKeyBetween(props.position, props.nextPosition),
          newEntityID: textEntity,
        });

        focusBlock(
          { value: textEntity, type: "text", parent: props.parent },
          { type: "start" },
        );
      } finally {
        setLoading(false);
      }
    });
  };

  let smoker = useSmoker();
  let submit = (errorPosition: { x: number; y: number }) => {
    if (loading) return;
    if (mode === "url") {
      if (!linkValue || linkValue === "") {
        smoker({ error: true, text: "no url!", position: errorPosition });
        return;
      }
      if (!isUrl(linkValue)) {
        smoker({ error: true, text: "invalid url!", position: errorPosition });
        return;
      }
      submitUrl();
    } else {
      if (!htmlValue.trim()) {
        smoker({ error: true, text: "no html!", position: errorPosition });
        return;
      }
      submitHtml();
    }
  };

  return (
    <form
      className="w-full h-full flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        let rect = document
          .getElementById("embed-block-submit")
          ?.getBoundingClientRect();
        submit({ x: rect ? rect.left + 12 : 0, y: rect ? rect.top : 0 });
      }}
    >
      <div className="w-full flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <ToggleGroup
            value={mode}
            onChange={setMode}
            options={[
              { value: "url", label: "URL" },
              { value: "html", label: "HTML" },
            ]}
          />
          <ToggleGroup
            value={
              (aspectRatioFact?.data.value ?? "fixed") as
                | "fixed"
                | "4/3"
                | "1/1"
                | "4/1"
            }
            onChange={setAspectRatio}
            options={[
              { value: "fixed", label: "Fixed" },
              { value: "4/3", label: "4:3" },
              { value: "1/1", label: "1:1" },
              { value: "4/1", label: "4:1" },
            ]}
          />
        </div>
        <button
          type="submit"
          id="embed-block-submit"
          disabled={loading}
          className={`p-1 ${isSelected ? "text-accent-contrast" : "text-border"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            submit({ x: e.clientX + 12, y: e.clientY });
          }}
        >
          {loading ? <DotLoader /> : <CheckTiny />}
        </button>
      </div>
      {mode === "url" ? (
        <div className="w-full flex-auto flex items-center justify-center">
          <div className={`max-w-sm flex gap-2 rounded-md text-secondary`}>
            <BlockEmbedSmall
              className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
            />
            <Separator />
            <Input
              id={embedInputId(props.entityID)}
              type="text"
              className="w-full grow border-none outline-hidden bg-transparent "
              placeholder="www.example.com"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <textarea
          id={embedInputId(props.entityID)}
          className="w-full flex-auto resize-none border-none outline-hidden bg-transparent font-mono text-sm text-secondary"
          placeholder="<p>paste html here</p>"
          value={htmlValue}
          onChange={(e) => setHtmlValue(e.target.value)}
        />
      )}
    </form>
  );
};
