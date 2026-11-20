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
import {
  questionsAudience,
  type QuestionsAudience,
} from "src/questionsAudience";
import { SubmissionSettings } from "../SubmissionSettings";

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
  let closesAt = useEntity(props.entityID, "questions/closes-at")?.data.value;
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
          <BlockSettings label="Questions" className="w-sm">
            <QuestionsSettings
              entityID={props.entityID}
              audience={audience}
              showPending={showPending}
              inPublication={!!data?.publications}
            />
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
          closesAt={closesAt}
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
          closesAt={closesAt}
        />
      )}
    </BlockLayout>
  );
};

function QuestionsSettings(props: {
  entityID: string;
  audience: QuestionsAudience;
  showPending: boolean;
  inPublication: boolean;
}) {
  let { rep } = useReplicache();
  return (
    <SubmissionSettings
      entityID={props.entityID}
      block="questions"
      audience={props.audience}
      inPublication={props.inPublication}
    >
      <ToggleWithLabel
        label="Show pending questions"
        helpText="Readers can see questions as soon as they are submitted. You can remove a question at any time."
        toggle={props.showPending}
        onToggle={() =>
          rep?.mutate.assertFact({
            entity: props.entityID,
            attribute: "questions/show-pending",
            data: { type: "boolean", value: !props.showPending },
          })
        }
      />
    </SubmissionSettings>
  );
}
