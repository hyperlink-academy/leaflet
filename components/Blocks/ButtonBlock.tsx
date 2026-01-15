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
import { ButtonPrimary } from "components/Buttons";
import { BlockButtonSmall } from "components/Icons/BlockButtonSmall";
import { CheckTiny } from "components/Icons/CheckTiny";
import { LinkSmall } from "components/Icons/LinkSmall";

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
  let alignment = useEntity(props.entityID, "block/text-alignment")?.data.value;

  return (
    <a
      href={url?.data.value}
      target="_blank"
      className={`relative hover:outline-accent-contrast rounded-md! ${alignment === "justify" && "w-full"} ${isSelected ? "block-border-selected border-0!" : "block-border border-transparent! border-0!"}`}
    >
      <ButtonPrimary
        role="link"
        type="submit"
        fullWidth={alignment === "justify"}
      >
        {text?.data.value}
      </ButtonPrimary>
    </a>
  );
};

const ButtonBlockSettings = (props: BlockProps) => {
  let { rep } = useReplicache();
  let smoker = useSmoker();
  let entity_set = useEntitySetContext();

  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let [textValue, setTextValue] = useState("");
  let [urlValue, setUrlValue] = useState("");
  let text = textValue;
  let url = urlValue;
  let alignment = useEntity(props.entityID, "block/text-alignment")?.data.value;

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

    // if no valid url prefix, default to https
    if (
      !urlValue.startsWith("http") &&
      !urlValue.startsWith("mailto") &&
      !urlValue.startsWith("tel:")
    )
      url = `https://${urlValue}`;

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
    <div
      className={`buttonBlockSettingsWrapper flex flex-col gap-2 w-full
     `}
    >
      <ButtonPrimary
        className={`relative  ${
          alignment === "center"
            ? "place-self-center"
            : alignment === "left"
              ? "place-self-start"
              : alignment === "right"
                ? "place-self-end"
                : "place-self-center"
        }`}
        fullWidth={alignment === "justify"}
      >
        {text !== "" ? text : "Button"}
      </ButtonPrimary>
      <BlockLayout
        isSelected={!!isSelected}
        borderOnHover
        hasBackground="accent"
        className="buttonBlockSettings text-tertiar hover:cursor-pointer border-dashed! p-0!"
      >
        <form
          className={`w-full`}
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
                className="w-full grow border-none outline-hidden bg-transparent"
                placeholder="button text"
                value={textValue}
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
                type="text"
                id="button-block-url-input"
                className="w-full grow border-none outline-hidden bg-transparent"
                placeholder="www.example.com"
                value={urlValue}
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
              className={`p-1 shrink-0 w-fit flex gap-2 items-center place-self-end ${isSelected ? "text-accent-contrast" : "text-accent-contrast sm:text-border"}`}
            >
              <div className="sm:hidden block">Save</div>
              <CheckTiny />
            </button>
          </div>
        </form>
      </BlockLayout>
    </div>
  );
};
