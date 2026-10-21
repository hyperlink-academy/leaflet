import { useEntitySetContext } from "components/EntitySetProvider";
import {
  useEditorBlockData,
  useLeafletPublicationData,
} from "components/PageSWRDataProvider";
import { ButtonPrimary } from "components/Buttons";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { publishedBlockKey } from "src/utils/interactionBlockAnchor";
import { ToggleWithLabel } from "components/Toggle";
import { ids } from "lexicons/api/lexicons";
import { pageOfParent } from "src/utils/blockGroups";
import { BlockProps, BlockLayout } from "../Block";
import { DEFAULT_QUESTIONS_BUTTON_TEXT } from "./constants";
import { DocumentQuestions } from "./DocumentQuestions";
import { QuestionsButtonTextInput, QuestionsDraft } from "./QuestionsView";
import { BlockSettings } from "../SettingsTriggerButton";
import { Radio } from "components/Checkbox";
import {
  QUESTIONS_AUDIENCES,
  QUESTIONS_AUDIENCE_LABELS,
  questionsAudience,
} from "src/questionsAudience";

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
      <ButtonPrimary disabled>
        {buttonText || DEFAULT_QUESTIONS_BUTTON_TEXT}
      </ButtonPrimary>
    );

  return (
    <BlockLayout
      isSelected={!!isSelected}
      className="questionsBlock"
      extraOptions={
        !props.preview ? (
          <BlockSettings label="Questions" className="w-xs">
            <div className="flex flex-col gap-2 p-2">
              <div className="text-sm font-bold text-secondary">
                Who can ask
              </div>
              {QUESTIONS_AUDIENCES.map((option) => (
                <Radio
                  key={option}
                  name={`questions-audience-${props.entityID}`}
                  id={`questions-audience-${props.entityID}-${option}`}
                  value={option}
                  checked={audience === option}
                  onChange={() =>
                    rep?.mutate.assertFact({
                      entity: props.entityID,
                      attribute: "questions/audience",
                      data: { type: "string", value: option },
                    })
                  }
                >
                  <div className="flex flex-col leading-snug">
                    <span>{QUESTIONS_AUDIENCE_LABELS[option].label}</span>
                    <span className="text-sm font-normal text-tertiary">
                      {QUESTIONS_AUDIENCE_LABELS[option].description}
                    </span>
                  </div>
                </Radio>
              ))}
              <hr className="border-border-light my-1" />
              <ToggleWithLabel
                label="Show pending questions"
                helpText="Readers see questions before you accept or answer them. Hidden ones never show."
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
        <QuestionsDraft
          action={button}
          audience={audience}
          showPending={showPending}
        />
      )}
    </BlockLayout>
  );
};
