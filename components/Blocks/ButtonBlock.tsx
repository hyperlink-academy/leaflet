import { useEntitySetContext } from "components/EntitySetProvider";
import { useCallback, useEffect, useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { BlockProps, BlockLayout } from "./Block";
import { addBlockBelow } from "src/utils/addBlockBelow";
import { useSmoker } from "components/Toast";

import { Separator } from "components/Layout";
import { Input } from "components/Input";
import { isUrl } from "src/utils/isURL";
import { focusBlock } from "src/utils/focusBlock";
import { ButtonPrimary } from "components/Buttons";
import { BlockButtonSmall } from "components/Icons/BlockButtonSmall";
import { CheckTiny } from "components/Icons/CheckTiny";
import { LinkSmall } from "components/Icons/LinkSmall";
import { ToggleGroup } from "components/ToggleGroup";
import {
  AlignCenterSmall,
  AlignJustifiedSmall,
  AlignLeftSmall,
  AlignRightSmall,
} from "components/Toolbar/TextAlignmentToolbar";
import { BlockSettings } from "./SettingsTriggerButton";

// Without a scheme the link would resolve relative to the post.
const normalizeButtonUrl = (url: string) =>
  url.startsWith("http") || url.startsWith("mailto") || url.startsWith("tel:")
    ? url
    : `https://${url}`;

export const ButtonBlock = (props: BlockProps & { preview?: boolean }) => {
  let { permissions } = useEntitySetContext();

  let text = useEntity(props.entityID, "button/text");
  let url = useEntity(props.entityID, "button/url");

  let isSelected = useIsBlockSelected(props.entityID);
  let alignment = useEntity(props.entityID, "block/text-alignment")?.data.value;

  if (!url) {
    // Previews are inert; never mount the settings form in one.
    if (!permissions.write || props.preview) return null;
    return <ButtonBlockSettings {...props} />;
  }

  return (
    <BlockLayout
      isSelected={!!isSelected}
      borderOnHover
      hasAlignment={alignment !== "justify"}
      className={`p-0! rounded-md! border-none!`}
      extraOptions={
        !props.preview ? (
          <ButtonBlockOptions entityID={props.entityID} />
        ) : undefined
      }
    >
      <a
        href={url?.data.value}
        target="_blank"
        referrerPolicy="no-referrer"
        className={` ${alignment === "justify" ? "w-full" : "w-fit"}`}
      >
        <ButtonPrimary
          role="link"
          type="submit"
          fullWidth={alignment === "justify"}
        >
          {text?.data.value}
        </ButtonPrimary>
      </a>
    </BlockLayout>
  );
};

const ButtonBlockSettings = (props: BlockProps) => {
  let { rep, undoManager } = useReplicache();
  let smoker = useSmoker();
  let entity_set = useEntitySetContext();

  let isSelected = useIsBlockSelected(props.entityID);

  let [textValue, setTextValue] = useState("");
  let [urlValue, setUrlValue] = useState("");
  let text = textValue;
  let url = urlValue;
  let alignment = useEntity(props.entityID, "block/text-alignment")?.data.value;

  let submit = async () => {
    await undoManager.withUndoGroup(async () => {
      let entity = props.entityID;
      if (!entity && rep) {
        entity = await addBlockBelow(rep, {
          parent: props.parent,
          position: props.position,
          nextPosition: props.nextPosition,
          permission_set: entity_set.set,
          type: "card",
        });
      }

      url = normalizeButtonUrl(urlValue);

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

      let textEntity = await addBlockBelow(rep, {
        parent: props.parent,
        position: props.position,
        nextPosition: props.nextPosition,
        permission_set: entity_set.set,
        type: "text",
      });

      focusBlock(
        {
          entityID: textEntity,
          type: "text",
          parent: props.parent,
        },
        { type: "start" },
      );
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
        className="buttonBlockSettings text-tertiary hover:cursor-pointer border-dashed! p-0!"
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

type Alignment = "left" | "center" | "right" | "justify";

function ButtonBlockOptions(props: { entityID: string }) {
  let { rep } = useReplicache();
  let smoker = useSmoker();
  let text = useEntity(props.entityID, "button/text")?.data.value ?? "";
  let url = useEntity(props.entityID, "button/url")?.data.value ?? "";
  let alignment: Alignment =
    useEntity(props.entityID, "block/text-alignment")?.data.value ?? "center";

  // Drafts are committed on blur/Enter so each edit is one undo step.
  let [textDraft, setTextDraft] = useState(text);
  let [urlDraft, setUrlDraft] = useState(url);
  useEffect(() => setTextDraft(text), [text]);
  useEffect(() => setUrlDraft(url), [url]);

  let commitText = () => {
    if (textDraft === text) return;
    if (!textDraft.trim()) {
      setTextDraft(text);
      return;
    }
    rep?.mutate.assertFact({
      entity: props.entityID,
      attribute: "button/text",
      data: { type: "string", value: textDraft },
    });
  };

  let commitUrl = (e: { currentTarget: Element }) => {
    if (urlDraft === url) return;
    if (!urlDraft || !isUrl(urlDraft)) {
      let rect = e.currentTarget.getBoundingClientRect();
      smoker({
        error: true,
        text: urlDraft ? "invalid url!" : "missing url!",
        position: { y: rect.top, x: rect.left + 12 },
      });
      setUrlDraft(url);
      return;
    }
    rep?.mutate.assertFact({
      entity: props.entityID,
      attribute: "button/url",
      data: { type: "string", value: normalizeButtonUrl(urlDraft) },
    });
  };

  return (
    <BlockSettings label="Button" className="w-xs">
      <label className="flex flex-col gap-1">
        <span className="font-bold">Button Text</span>
        <Input
          type="text"
          className="input-with-border"
          value={textDraft}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setTextDraft(e.currentTarget.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText();
            }
          }}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-bold">Link</span>
        <Input
          type="text"
          className="input-with-border"
          placeholder="www.example.com"
          value={urlDraft}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setUrlDraft(e.currentTarget.value)}
          onBlur={commitUrl}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitUrl(e);
            }
          }}
        />
      </label>
      <hr className="border-border-light" />
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">Alignment</span>
        <ToggleGroup<Alignment>
          value={alignment}
          background="light"
          onChange={(value) =>
            rep?.mutate.assertFact({
              entity: props.entityID,
              attribute: "block/text-alignment",
              data: { type: "text-alignment-type-union", value },
            })
          }
          options={[
            { value: "left", label: <AlignLeftSmall aria-label="Left" /> },
            {
              value: "center",
              label: <AlignCenterSmall aria-label="Center" />,
            },
            { value: "right", label: <AlignRightSmall aria-label="Right" /> },
            {
              value: "justify",
              label: <AlignJustifiedSmall aria-label="Full Width" />,
            },
          ]}
        />
      </div>
    </BlockSettings>
  );
}
