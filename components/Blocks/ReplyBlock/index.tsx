import { useEntitySetContext } from "components/EntitySetProvider";
import {
  useEditorBlockData,
  useLeafletPublicationData,
} from "components/PageSWRDataProvider";
import { ButtonPrimary } from "components/Buttons";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { publishedBlockKey } from "src/utils/interactionBlockAnchor";
import { ids } from "lexicons/api/lexicons";
import { BlockProps, BlockLayout } from "../Block";
import {
  DEFAULT_REPLY_BUTTON_TEXT,
  DEFAULT_REPLY_PROMPT_TEXT,
} from "./constants";
import { DocumentReplies } from "./DocumentReplies";
import {
  RepliesDraft,
  ReplyButtonTextInput,
  ReplyPromptTextInput,
} from "./RepliesView";
import { BlockSettings } from "../SettingsTriggerButton";
import { ToggleWithLabel } from "components/Toggle";

export const ReplyBlock = (props: BlockProps & { preview?: boolean }) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let buttonText =
    useEntity(props.entityID, "reply/button-text")?.data.value ?? "";
  let promptText =
    useEntity(props.entityID, "reply/prompt-text")?.data.value ?? "";
  let showThemes =
    useEntity(props.entityID, "reply/show-publication-theme")?.data.value !==
    false;
  let { data, normalizedDocument } = useLeafletPublicationData();
  let documentUri = data?.documents?.uri;
  let { replies: initial } = useEditorBlockData();

  let blockKey = publishedBlockKey(
    normalizedDocument,
    ids.PubLeafletBlocksReply,
    props.entityID,
  );

  let editable = permissions.write && !props.preview;

  let button = editable ? (
    <ReplyButtonTextInput
      value={buttonText}
      onCommit={(value) =>
        rep?.mutate.assertFact({
          entity: props.entityID,
          attribute: "reply/button-text",
          data: { type: "string", value },
        })
      }
    />
  ) : (
    <ButtonPrimary disabled>
      {buttonText || DEFAULT_REPLY_BUTTON_TEXT}
    </ButtonPrimary>
  );

  let prompt = editable ? (
    <ReplyPromptTextInput
      value={promptText}
      onCommit={(value) =>
        rep?.mutate.assertFact({
          entity: props.entityID,
          attribute: "reply/prompt-text",
          data: { type: "string", value },
        })
      }
    />
  ) : (
    promptText || DEFAULT_REPLY_PROMPT_TEXT
  );

  return (
    <BlockLayout
      isSelected={!!isSelected}
      className={`replyBlock light-container rounded-lg! ${isSelected ? "border-border!" : ""}`}
      extraOptions={
        !props.preview ? (
          <BlockSettings label="Replies" className="w-xs">
            <ToggleWithLabel
              label="Show submissions with themes"
              helpText="Each reply appears in its own publication's theme."
              toggle={showThemes}
              onToggle={() =>
                rep?.mutate.assertFact({
                  entity: props.entityID,
                  attribute: "reply/show-publication-theme",
                  data: { type: "boolean", value: !showThemes },
                })
              }
            />
          </BlockSettings>
        ) : undefined
      }
    >
      {blockKey !== undefined && documentUri && !props.preview ? (
        <DocumentReplies
          documentUri={documentUri}
          block={blockKey}
          showThemes={showThemes}
          prompt={prompt}
          action={button}
          initial={initial}
        />
      ) : (
        <>
          {" "}
          {editable && !promptText && !buttonText && (
            <>
              <div className="text-center w-full text-sm text-tertiary italic ">
                Click the prompt and button text to edit them.
              </div>
              <hr className="mb-2 mt-1" />
            </>
          )}
          <RepliesDraft prompt={prompt} action={button} />
        </>
      )}
    </BlockLayout>
  );
};
