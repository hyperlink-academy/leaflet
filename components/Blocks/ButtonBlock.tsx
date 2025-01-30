import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useCallback, useEffect, useState } from "react";
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
import { useDrag } from "src/hooks/useDrag";

export const ButtonBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();
  let { rep } = useReplicache();

  let text = useEntity(props.entityID, "button/text");
  let url = useEntity(props.entityID, "button/url");

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
		  w-full h-[120px] p-2
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
        <BlockInput {...props} />
      </label>
    );
  }

  return (
    // let's use ButtonPrimary styles, but render in a link, just <a> tag
    // TODO: add block selected state
    // TODO: add alignment options
    <div>
      <a
        className={`
        m-0 h-max w-max
        px-2 py-0.5 rounded-md 
        bg-accent-1 outline-transparent border border-accent-1
        text-base font-bold text-accent-2 !no-underline
        flex gap-2 items-center justify-center shrink-0
        transparent-outline hover:outline-accent-1 outline-offset-1
        disabled:bg-border-light disabled:border-border-light disabled:text-border disabled:hover:text-border
      `}
        href={url?.data.value}
        target="_blank"
      >
        {text?.data.value}
      </a>
    </div>
  );
};

const BlockInput = (props: BlockProps) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let isLocked = useEntity(props.entityID, "block/is-locked")?.data.value;

  let entity_set = useEntitySetContext();

  let [textValue, setTextValue] = useState("");
  let [urlValue, setUrlValue] = useState("");

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
    let text = textValue;
    let url = urlValue;

    //TODO: exceptions for mailto and tel as well?
    if (!urlValue.startsWith("http")) url = `https://${urlValue}`;

    // these mutations = simpler subset of addLinkBlock
    if (!rep) return;
    await rep.mutate.assertFact({
      entity: entity,
      attribute: "block/type",
      data: { type: "block-type-union", value: "button" },
    });
    await rep?.mutate.assertFact({
      entity: entity,
      attribute: "button/text",
      data: {
        type: "string",
        value: text,
      },
    });
    await rep?.mutate.assertFact({
      entity: entity,
      attribute: "button/url",
      data: {
        type: "string",
        value: url,
      },
    });
  };
  let smoker = useSmoker();

  return (
    <div>
      <div className="max-w-sm flex gap-2 rounded-md text-secondary">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {/* TODO: replace icon */}
            <BlockEmbedSmall
              className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
            />
            <Separator />
            <Input
              type="text"
              className="w-full grow border-none outline-none bg-transparent"
              placeholder="button text"
              value={textValue}
              disabled={isLocked}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                // TODO: fix! it's deleting even if non-empty idk
                if (
                  e.key === "Backspace" &&
                  textValue === "" &&
                  urlValue === ""
                ) {
                  rep && deleteBlock([props.entityID].flat(), rep);
                  return;
                }
                if (e.key === "Enter") {
                  if (!textValue || !urlValue) return;
                  if (!isUrl(urlValue)) {
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
          </div>
          <div className="flex gap-2">
            {/* TODO: replace icon */}
            <BlockEmbedSmall
              className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
            />
            <Separator />
            <Input
              type="url"
              className="w-full grow border-none outline-none bg-transparent"
              placeholder="www.example.com"
              value={urlValue}
              disabled={isLocked}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && urlValue === "") {
                  // TODO: focus prev input - ???
                }
                if (e.key === "Enter") {
                  if (!textValue || !urlValue) return;
                  if (!isUrl(urlValue)) {
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
          </div>
        </div>
        {/* <div className="flex items-center gap-3 "> */}
        <button
          className={`p-1 ${isSelected && !isLocked ? "text-accent-contrast" : "text-border"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            if (!textValue) {
              smoker({
                error: true,
                text: "missing button text!",
                position: { x: e.clientX, y: e.clientY },
              });
              return;
            }
            if (!urlValue) {
              smoker({
                error: true,
                text: "missing url!",
                position: { x: e.clientX, y: e.clientY },
              });
              return;
            }
            if (!isUrl(urlValue)) {
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
        {/* </div> */}
      </div>
    </div>
  );
};
