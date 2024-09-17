import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useEffect, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { addLinkBlock } from "src/utils/addLinkBlock";
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

export const ExternalLinkBlock = (
  props: BlockProps & { preview?: boolean },
) => {
  let { permissions } = useEntitySetContext();
  let previewImage = useEntity(props.entityID, "link/preview");
  let title = useEntity(props.entityID, "link/title");
  let description = useEntity(props.entityID, "link/description");
  let url = useEntity(props.entityID, "link/url");

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  useEffect(() => {
    let input = document.getElementById(elementId.block(props.entityID).input);
    if (isSelected) {
      input?.focus();
    } else input?.blur();
  }, [isSelected]);

  if (!url) {
    if (!permissions.write) return null;
    return (
      <label
        id={props.preview ? undefined : elementId.block(props.entityID).input}
        className={`
          w-full h-[104px] p-2
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
    <a
      href={url?.data.value}
      target="_blank"
      className={`
        externalLinkBlock flex relative group/linkBlock
        h-[104px] w-full bg-bg-page overflow-hidden text-primary hover:no-underline no-underline
        border  hover:border-accent-contrast outline outline-1 -outline-offset-0 rounded-lg shadow-sm
        ${isSelected ? "outline-accent-contrast border-accent-contrast" : "outline-transparent border-border-light"}
        `}
    >
      <div className="pt-2 pb-2 px-3 grow min-w-0">
        <div className="flex flex-col w-full min-w-0 h-full grow ">
          <div
            className={`linkBlockTitle bg-transparent -mb-0.5  border-none text-base font-bold outline-none resize-none align-top border h-[24px] line-clamp-1`}
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-all",
            }}
          >
            {title?.data.value}
          </div>

          <div
            className={`linkBlockDescription text-sm bg-transparent border-none outline-none resize-none align-top  grow line-clamp-2`}
          >
            {description?.data.value}
          </div>
          <div
            style={{ wordBreak: "break-word" }} // better than tailwind break-all!
            className={`min-w-0 w-full line-clamp-1 text-xs italic group-hover/linkBlock:text-accent-contrast ${isSelected ? "text-accent-contrast" : "text-tertiary"}`}
          >
            {url?.data.value}
          </div>
        </div>
      </div>

      <div
        className={`linkBlockPreview w-[120px] m-2 -mb-2 bg-cover shrink-0 rounded-t-md border border-border rotate-[4deg] origin-center`}
        style={{
          backgroundImage: `url(${previewImage?.data.src})`,
          backgroundPosition: "center",
        }}
      />
    </a>
  );
};

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
    addLinkBlock(link, entity, rep);
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
