import { useEntitySetContext } from "components/EntitySetProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { ButtonPrimary } from "components/Buttons";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { documentHasReplyBlock } from "src/utils/documentHasReplyBlock";
import { BlockProps, BlockLayout } from "../Block";
import { DEFAULT_REPLY_BUTTON_TEXT } from "./constants";
import { DocumentReplies } from "./DocumentReplies";
import { RepliesDraft, ReplyButtonTextInput } from "./RepliesView";
import { BlockSettings } from "../SettingsTriggerButton";
import { ToggleWithLabel } from "components/Toggle";

export const ReplyBlock = (props: BlockProps & { preview?: boolean }) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let buttonText =
    useEntity(props.entityID, "reply/button-text")?.data.value ?? "";
  let showThemes =
    useEntity(props.entityID, "reply/show-publication-theme")?.data.value !==
    false;
  let { data, normalizedDocument } = useLeafletPublicationData();
  let documentUri = data?.documents?.uri;

  // Readers can only reply once the published document carries the block, so
  // a block added since the last publish is still a draft.
  let isPublished =
    !!normalizedDocument && documentHasReplyBlock(normalizedDocument);

  let button =
    permissions.write && !props.preview ? (
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

  return (
    <BlockLayout
      isSelected={!!isSelected}
      className="replyBlock border-none! p-0! rounded-none! overflow-visible!"
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
      {isPublished && documentUri && !props.preview ? (
        <DocumentReplies
          documentUri={documentUri}
          showThemes={showThemes}
          action={button}
        />
      ) : (
        <RepliesDraft action={button} />
      )}
    </BlockLayout>
  );
};
