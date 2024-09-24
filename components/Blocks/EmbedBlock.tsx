import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useEffect, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps } from "./Block";
import { v7 } from "uuid";
import { useSmoker } from "components/Toast";
import { BlockLinkSmall, CheckTiny } from "components/Icons";
import { Separator } from "components/Layout";
import { Input } from "components/Input";
import { isUrl } from "src/utils/isURL";
import { elementId } from "src/utils/elementId";
import { deleteBlock } from "./DeleteBlock";
import { focusBlock } from "src/utils/focusBlock";

export const EmbedBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();
  let url = useEntity(props.entityID, "embed/url");

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  useEffect(() => {
    let input = document.getElementById(elementId.block(props.entityID).input);
    if (isSelected) {
      input?.focus();
    } else input?.blur();
  }, [isSelected, props.entityID]);

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
    <div
      className={`
        flex flex-col relative w-full bg-border-light overflow-hidden group/embedBlock
        border outline outline-1 -outline-offset-0 rounded-lg
        ${isSelected ? "border-tertiary outline-tertiary" : "border-transparent outline-transparent"}
        `}
    >
      {/*
	  the iframe! 
	  very simple, just a fixed height (could add as an option)
	  can also add 'allow' and 'referrerpolicy' attributes later if needed 
	  */}
      <iframe
        width="100%"
        height="420"
        src={url?.data.value}
        allow="fullscreen"
        loading="lazy"
      ></iframe>

      {/* link source */}
      {/* TODO: more subtle, maybe icon + only show link on hover? */}
      {/* disabled for now, idk how to make non-obtrusive, maybe we don't need */}
      {/* <div className="py-1 px-2 m-2 grow min-w-0 absolute bottom-0 bg-border-light rounded-md"> */}
      {/* <div className="py-2 px-3 grow min-w-0 bg-border-light hidden group-hover/embedBlock:inline-block"> */}
      {/* <div className="py-1 px-2 m-2 grow min-w-0 bg-border-light absolute bottom-0 rounded-md hidden group-hover/embedBlock:inline-block"> */}
      {/* <a
          href={url?.data.value}
          target="_blank"
          style={{ wordBreak: "break-word" }} // better than tailwind break-all!
          className={`min-w-0 w-full line-clamp-1 text-xs italic ${isSelected ? "text-accent-contrast" : "text-accent-contrast"}`}
        >
          {url?.data.value}
        </a> */}
      {/* </div> */}
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
        type: "text",
        value: link,
      },
    });
  };
  let smoke = useSmoker();

  return (
    <div className={`max-w-sm flex gap-2 rounded-md text-secondary`}>
      <>
        <BlockLinkSmall
          className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
        />
        <Separator />
        <Input
          type="url"
          className="w-full grow border-none outline-none bg-transparent "
          placeholder="www.example.com"
          value={linkValue}
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
                smoke({
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
            className={`p-1 ${isSelected ? "text-accent-contrast" : "text-border"}`}
            onMouseDown={(e) => {
              e.preventDefault();
              if (!linkValue || linkValue === "") {
                smoke({
                  error: true,
                  text: "no url!",
                  position: { x: e.clientX, y: e.clientY },
                });
                return;
              }
              if (!isUrl(linkValue)) {
                smoke({
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
      </>
    </div>
  );
};
