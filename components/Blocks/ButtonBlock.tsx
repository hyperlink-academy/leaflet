import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { useCallback, useEffect, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { BlockProps } from "./Block";
import { v7 } from "uuid";
import { useSmoker } from "components/Toast";
import {
  BlockEmbedSmall,
  LinkSmall,
  CheckTiny,
  BlockButtonSmall,
} from "components/Icons";
import { Separator } from "components/Layout";
import { Input } from "components/Input";
import { isUrl } from "src/utils/isURL";
import { deleteBlock } from "./DeleteBlock";
import { ButtonPrimary } from "components/Buttons";

export const ButtonBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();

  let text = useEntity(props.entityID, "button/text");
  let url = useEntity(props.entityID, "button/url");

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  if (!url) {
    if (!permissions.write) return null;
    return <ButtonBlockSettings {...props} />;
  }

  return (
    <form
      action={url?.data.value}
      target="_blank"
      className={`hover:outline-accent-contrast !rounded-md  ${isSelected ? "block-border-selected !border-0" : "block-border !border-transparent !border-0"}`}
    >
      <ButtonPrimary type="submit">{text?.data.value}</ButtonPrimary>
    </form>
  );
};

const ButtonBlockSettings = (props: BlockProps) => {
  let { rep } = useReplicache();
  let smoker = useSmoker();
  let entity_set = useEntitySetContext();

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let isLocked = useEntity(props.entityID, "block/is-locked")?.data.value;

  let [textValue, setTextValue] = useState("");
  let [urlValue, setUrlValue] = useState("");
  let text = textValue;
  let url = urlValue;

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

  return (
    <div className="buttonBlockSettingsWrapper flex flex-col gap-2 w-full">
      <ButtonPrimary className="mx-auto">
        {text !== "" ? text : "Button"}
      </ButtonPrimary>

      <form
        className={`
        buttonBlockSettingsBorder
        w-full bg-bg-page
    		text-tertiary hover:text-accent-contrast hover:cursor-pointer hover:p-0
    		flex flex-col gap-2 items-center justify-center hover:border-2 border-dashed rounded-lg
  		  ${isSelected ? "border-2 border-tertiary p-0" : "border border-border p-[1px]"}
  		  `}
        onSubmit={(e) => {
          e.preventDefault();
          let rect = document
            .getElementById("button-block-settings")
            ?.getBoundingClientRect();
          if (!textValue) {
            smoker({
              error: true,
              text: "missing button text!",
              position: {
                y: rect ? rect.top : 0,
                x: rect ? rect.left + 12 : 0,
              },
            });
            return;
          }
          if (!urlValue) {
            smoker({
              error: true,
              text: "missing url!",
              position: {
                y: rect ? rect.top : 0,
                x: rect ? rect.left + 12 : 0,
              },
            });
            return;
          }
          if (!isUrl(urlValue)) {
            smoker({
              error: true,
              text: "invalid url!",
              position: {
                y: rect ? rect.top : 0,
                x: rect ? rect.left + 12 : 0,
              },
            });
            return;
          }
          submit();
        }}
      >
        <div className="buttonBlockSettingsContent w-full flex flex-col sm:flex-row gap-2 text-secondary px-2 py-3 sm:pb-3 pb-1">
          <div className="buttonBlockSettingsTitleInput flex gap-2 w-full sm:w-52">
            <BlockButtonSmall
              className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
            />
            <Separator />
            <Input
              type="text"
              autoFocus
              className="w-full grow border-none outline-none bg-transparent"
              placeholder="button text"
              value={textValue}
              disabled={isLocked}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Backspace" &&
                  !e.currentTarget.value &&
                  urlValue !== ""
                )
                  e.preventDefault();
              }}
            />
          </div>
          <div className="buttonBlockSettingsLinkInput grow flex gap-2 w-full">
            <LinkSmall
              className={`shrink-0  ${isSelected ? "text-tertiary" : "text-border"} `}
            />
            <Separator />
            <Input
              type="url"
              id="button-block-url-input"
              className="w-full grow border-none outline-none bg-transparent"
              placeholder="www.example.com"
              value={urlValue}
              disabled={isLocked}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !e.currentTarget.value)
                  e.preventDefault();
              }}
            />
          </div>
          <button
            id="button-block-settings"
            type="submit"
            className={`p-1 shrink-0 w-fit flex gap-2 items-center place-self-end ${isSelected && !isLocked ? "text-accent-contrast" : "text-accent-contrast sm:text-border"}`}
          >
            <div className="sm:hidden block">Save</div>
            <CheckTiny />
          </button>
        </div>
      </form>
    </div>
  );
};
