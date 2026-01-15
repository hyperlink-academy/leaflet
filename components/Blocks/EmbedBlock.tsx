import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useCallback, useEffect, useState } from "react";
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

export const EmbedBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();
  let url = useEntity(props.entityID, "embed/url");
  let isCanvasBlock = props.pageType === "canvas";

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let height = useEntity(props.entityID, "embed/height")?.data.value || 360;

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

  useEffect(() => {
    if (props.preview) return;
    let input = document.getElementById(elementId.block(props.entityID).input);
    if (isSelected) {
      input?.focus();
    } else input?.blur();
  }, [isSelected, props.entityID, props.preview]);

  if (!url) {
    if (!permissions.write) return null;
    return (
      <label
        id={props.preview ? undefined : elementId.block(props.entityID).input}
        className={`
          w-full h-[420px] p-2
          text-tertiary hover:text-accent-contrast hover:cursor-pointer
          flex flex-auto gap-2 items-center justify-center hover:border-2 border-dashed rounded-lg
          ${isSelected ? "border-2 border-tertiary" : "border border-border"}
          ${props.pageType === "canvas" && "bg-bg-page"}`}
        onMouseDown={() => {
          focusBlock(
            { type: props.type, value: props.entityID, parent: props.parent },
            { type: "start" },
          );
        }}
      >
        <BlockLinkInput {...props} />
      </label>
    );
  }
  if (props.preview) return null;

  return (
    <div
      className={`w-full ${heightHandle.dragDelta ? "pointer-events-none" : ""}`}
    >
      <BlockLayout
        isSelected={!!isSelected}
        className="flex flex-col relative w-full overflow-hidden group/embedBlock p-0!"
      >
        <iframe
          width="100%"
          height={height + (heightHandle.dragDelta?.y || 0)}
          src={url?.data.value}
          allow="fullscreen"
          loading="lazy"
        ></iframe>
      </BlockLayout>
      {/* <div className="w-full overflow-x-hidden truncate text-xs italic text-accent-contrast">
        <a
          href={url?.data.value}
          target="_blank"
          className={`py-0.5 min-w-0 w-full whitespace-nowrap`}
        >
          {url?.data.value}
        </a>
      </div> */}

      {!props.preview && permissions.write && (
        <>
          <div
            data-draggable
            className={`resizeHandle
          cursor-ns-resize shrink-0 z-10 w-6 h-[5px]
          absolute bottom-2 right-1/2 translate-x-1/2 translate-y-[2px]
          rounded-full bg-white  border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,inset_0_0_0_1px_white]
          ${isCanvasBlock ? "hidden group-hover/canvas-block:block" : ""}`}
            {...heightHandle.handlers}
          />
        </>
      )}
    </div>
  );
};

// TODO: maybe extract into a component…
// would just have to branch for the mutations (addLinkBlock or addEmbedBlock)
const BlockLinkInput = (props: BlockProps) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let entity_set = useEntitySetContext();
  let [linkValue, setLinkValue] = useState("");
  let [loading, setLoading] = useState(false);
  let { rep } = useReplicache();
  let submit = async () => {
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

      if (res.status === 200) {
        let data = await (res.json() as LinkPreviewMetadataResult);
        if (data.success && data.data.links?.player?.[0]) {
          let embed = data.data.links.player[0];
          embedUrl = embed.href;
          embedHeight = embed.media?.height || 300;
        }
      }

      await rep.mutate.assertFact([
        {
          entity: entity,
          attribute: "embed/url",
          data: {
            type: "string",
            value: embedUrl,
          },
        },
        {
          entity: entity,
          attribute: "embed/height",
          data: {
            type: "number",
            value: embedHeight,
          },
        },
      ]);
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
  };
  let smoker = useSmoker();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (loading) return;
        let rect = document
          .getElementById("embed-block-submit")
          ?.getBoundingClientRect();
        if (!linkValue || linkValue === "") {
          smoker({
            error: true,
            text: "no url!",
            position: { x: rect ? rect.left + 12 : 0, y: rect ? rect.top : 0 },
          });
          return;
        }
        if (!isUrl(linkValue)) {
          smoker({
            error: true,
            text: "invalid url!",
            position: {
              x: rect ? rect.left + 12 : 0,
              y: rect ? rect.top : 0,
            },
          });
          return;
        }
        submit();
      }}
    >
      <div className={`max-w-sm flex gap-2 rounded-md text-secondary`}>
        <BlockEmbedSmall
          className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
        />
        <Separator />
        <Input
          type="text"
          className="w-full grow border-none outline-hidden bg-transparent "
          placeholder="www.example.com"
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
        />
        <button
          type="submit"
          id="embed-block-submit"
          disabled={loading}
          className={`p-1 ${isSelected ? "text-accent-contrast" : "text-border"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            if (loading) return;
            if (!linkValue || linkValue === "") {
              smoker({
                error: true,
                text: "no url!",
                position: { x: e.clientX + 12, y: e.clientY },
              });
              return;
            }
            if (!isUrl(linkValue)) {
              smoker({
                error: true,
                text: "invalid url!",
                position: { x: e.clientX + 12, y: e.clientY },
              });
              return;
            }
            submit();
          }}
        >
          {loading ? <DotLoader /> : <CheckTiny />}
        </button>
      </div>
    </form>
  );
};
