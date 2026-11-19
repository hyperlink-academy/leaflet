import { useEntitySetContext } from "components/EntitySetProvider";
import {
  useEditorBlockData,
  useLeafletPublicationData,
} from "components/PageSWRDataProvider";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { publishedBlockKey } from "src/utils/interactionBlockAnchor";
import { ToggleWithLabel } from "components/Toggle";
import { ids } from "lexicons/api/lexicons";
import { pageOfParent } from "src/utils/blockGroups";
import { BlockProps, BlockLayout } from "../Block";
import { DocumentQuestions } from "./DocumentQuestions";
import {
  DisabledAskButton,
  QuestionsButtonTextInput,
  QuestionEditorEmpty,
} from "./QuestionsView";
import { BlockSettings } from "../SettingsTriggerButton";
import { questionsAudience } from "src/questionsAudience";
import { AudienceOptions } from "../AudienceOptions";

export const QuestionsBlock = (props: BlockProps & { preview?: boolean }) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let buttonText =
    useEntity(props.entityID, "questions/button-text")?.data.value ?? "";
  let audience = questionsAudience(
    useEntity(props.entityID, "questions/audience")?.data.value,
  );
  let showPending = !!useEntity(props.entityID, "questions/show-pending")?.data
    .value;
  let { data, normalizedDocument } = useLeafletPublicationData();
  let documentUri = data?.documents?.uri;
  let { questions: initial } = useEditorBlockData();

  // Readers can only ask once the published document carries the block, so
  // a block added since the last publish is still a draft.
  let blockKey = publishedBlockKey(
    normalizedDocument,
    ids.PubLeafletBlocksQuestions,
    props.entityID,
  );

  let button =
    permissions.write && !props.preview ? (
      <QuestionsButtonTextInput
        value={buttonText}
        onCommit={(value) =>
          rep?.mutate.assertFact({
            entity: props.entityID,
            attribute: "questions/button-text",
            data: { type: "string", value },
          })
        }
      />
    ) : (
      <DisabledAskButton text={buttonText} />
    );

  return (
    <BlockLayout
      isSelected={!!isSelected}
      className={`questionsBlock light-container rounded-lg! ${isSelected ? "border-border!" : ""}`}
      extraOptions={
        !props.preview ? (
          <BlockSettings label="Questions" className="max-w-sm">
            <div className="flex flex-col gap-2 ">
              <AudienceOptions
                entityID={props.entityID}
                attribute="questions/audience"
                value={audience}
                label="Who can submit questions"
                inPublication={!!data?.publications}
              />
              <hr className="border-border-light my-1" />
              <ToggleWithLabel
                label="Show pending questions"
                helpText="Readers see questions before you answer them. Removed ones never show."
                toggle={showPending}
                onToggle={() =>
                  rep?.mutate.assertFact({
                    entity: props.entityID,
                    attribute: "questions/show-pending",
                    data: { type: "boolean", value: !showPending },
                  })
                }
              />
            </div>
          </BlockSettings>
        ) : undefined
      }
    >
      {blockKey !== undefined && documentUri && !props.preview ? (
        <DocumentQuestions
          documentUri={documentUri}
          block={blockKey}
          audience={audience}
          showPending={showPending}
          editor={{
            blockEntity: props.entityID,
            page: pageOfParent(props.parent),
            action: button,
            initial,
          }}
        />
      ) : (
        <QuestionEditorEmpty
          action={button}
          audience={audience}
          showPending={showPending}
        />
      )}
    </BlockLayout>
  );
};
