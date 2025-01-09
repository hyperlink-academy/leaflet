import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useEffect, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps } from "./Block";
import { v7 } from "uuid";
import { useSmoker } from "components/Toast";
import { BlockEmbedSmall, CheckTiny } from "components/Icons";
import { Separator } from "components/Layout";
import { Input } from "components/Input";
import { isUrl } from "src/utils/isURL";
import { elementId } from "src/utils/elementId";
import { deleteBlock } from "./DeleteBlock";
import { focusBlock } from "src/utils/focusBlock";

export const EmbedBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();
  let url = useEntity(props.entityID, "embed/url");
  let isCanvasBlock = props.pageType === "canvas";

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

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

  return (
    <div className="w-full aspect-[4/3]">
      {/*
	  the iframe!
	  very simple, just a fixed height (could add as an option)
	  can also add 'allow' and 'referrerpolicy' attributes later if needed
	  */}
      <iframe
        className={`
              flex flex-col relative w-full overflow-hidden group/embedBlock
              ${isSelected ? "block-border-selected " : "block-border"}
              `}
        width="100%"
        height="100%"
        src={url?.data.value}
        allow="fullscreen"
        loading="lazy"
      ></iframe>
      <div className="w-full overflow-x-hidden truncate text-xs italic text-accent-contrast">
        <a
          href={url?.data.value}
          target="_blank"
          className={`py-0.5 min-w-0 w-full whitespace-nowrap`}
        >
          {url?.data.value}
        </a>
      </div>
    </div>
  );
};

// TODO: maybe extract into a component…
// would just have to branch for the mutations (addLinkBlock or addEmbedBlock)
const BlockLinkInput = (props: BlockProps) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let isLocked = useEntity(props.entityID, "block/is-locked")?.data.value;

  let entity_set = useEntitySetContext();
  let [linkValue, setLinkValue] = useState("");
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
    // these mutations = simpler subset of addLinkBlock
    if (!rep) return;
    await rep.mutate.assertFact({
      entity: entity,
      attribute: "block/type",
      data: { type: "block-type-union", value: "embed" },
    });
    await rep?.mutate.assertFact({
      entity: entity,
      attribute: "embed/url",
      data: {
        type: "string",
        value: link,
      },
    });
  };
  let smoker = useSmoker();

  return (
    <div>
      <div className={`max-w-sm flex gap-2 rounded-md text-secondary`}>
        <BlockEmbedSmall
          className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
        />
        <Separator />
        <Input
          type="url"
          className="w-full grow border-none outline-none bg-transparent "
          placeholder="www.example.com"
          value={linkValue}
          disabled={isLocked}
          onChange={(e) => setLinkValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && linkValue === "") {
              rep && deleteBlock([props.entityID].flat(), rep);
              return;
            }
            if (e.key === "Enter") {
              if (!linkValue) return;
              if (!isUrl(linkValue)) {
                let rect = e.currentTarget.getBoundingClientRect();
                smoker({
                  error: true,
                  text: "invalid url!",
                  position: { x: rect.left, y: rect.top - 8 },
                });
                return;
              }
              submit();
            }
          }}
        />
        <div className="flex items-center gap-3 ">
          <button
            className={`p-1 ${isSelected && !isLocked ? "text-accent-contrast" : "text-border"}`}
            onMouseDown={(e) => {
              e.preventDefault();
              if (!linkValue || linkValue === "") {
                smoker({
                  error: true,
                  text: "no url!",
                  position: { x: e.clientX, y: e.clientY },
                });
                return;
              }
              if (!isUrl(linkValue)) {
                smoker({
                  error: true,
                  text: "invalid url!",
                  position: { x: e.clientX, y: e.clientY },
                });
                return;
              }
              submit();
            }}
          >
            <CheckTiny />
          </button>
        </div>
      </div>
    </div>
  );
};
