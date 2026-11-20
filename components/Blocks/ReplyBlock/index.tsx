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
import { RepliesEmptyDraft } from "./RepliesList";
import { ReplyButtonTextInput, ReplyPromptTextInput } from "./RepliesHeader";
import { BlockSettings } from "../SettingsTriggerButton";
import { ToggleWithLabel } from "components/Toggle";
import {
  questionsAudience,
  type QuestionsAudience,
} from "src/questionsAudience";
import { AudienceOptions } from "../AudienceOptions";
import {
  CloseSubmissionsOption,
  ClosesAtPage,
  usePopoverHeight,
} from "../CloseSubmissionsOption";

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
  let audience = questionsAudience(
    useEntity(props.entityID, "reply/audience")?.data.value,
  );
  let closesAt = useEntity(props.entityID, "reply/closes-at")?.data.value;
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
      className={`replyBlock light-container rounded-lg!  ${isSelected ? "border-border!" : ""}`}
      extraOptions={
        !props.preview ? (
          <BlockSettings label="Replies" className="w-sm">
            <ReplySettings
              entityID={props.entityID}
              audience={audience}
              showThemes={showThemes}
              inPublication={!!data?.publications}
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
          audience={audience}
          closesAt={closesAt}
          prompt={prompt}
          action={button}
          initial={initial}
        />
      ) : (
        <RepliesEmptyDraft
          audience={audience}
          closesAt={closesAt}
          prompt={prompt}
          action={button}
        />
      )}
    </BlockLayout>
  );
};

function ReplySettings(props: {
  entityID: string;
  audience: QuestionsAudience;
  showThemes: boolean;
  inPublication: boolean;
}) {
  let { rep } = useReplicache();
  let page = usePopoverHeight();
  return (
    <div ref={page.ref} style={page.style} className="flex flex-col gap-3">
      {page.onSubpage ? (
        <ClosesAtPage
          entityID={props.entityID}
          attribute="reply/closes-at"
          onBack={page.back}
        />
      ) : (
        <>
          <AudienceOptions
            entityID={props.entityID}
            block="reply"
            value={props.audience}
            label="Who can submit replies"
            inPublication={props.inPublication}
          />
          <hr className="border-border-light my-1" />
          <CloseSubmissionsOption
            entityID={props.entityID}
            attribute="reply/closes-at"
            submissions="replies"
            onPickDate={page.open}
          />
          <hr className="border-border-light my-1" />
          <ToggleWithLabel
            label="Show submission themes"
            helpText="Replies appear in their publication theme."
            toggle={props.showThemes}
            onToggle={() =>
              rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: "reply/show-publication-theme",
                data: { type: "boolean", value: !props.showThemes },
              })
            }
          />
        </>
      )}
    </div>
  );
}
