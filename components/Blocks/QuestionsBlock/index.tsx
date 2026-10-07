import { useEntitySetContext } from "components/EntitySetProvider";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { ButtonPrimary } from "components/Buttons";
import { useEntity, useReplicache } from "src/replicache";
import { useIsBlockSelected } from "src/useUIState";
import { documentHasBlock } from "src/utils/documentHasBlock";
import { ids } from "lexicons/api/lexicons";
import { pageOfParent } from "src/utils/blockGroups";
import { BlockProps, BlockLayout } from "../Block";
import { DEFAULT_QUESTIONS_BUTTON_TEXT } from "./constants";
import { DocumentQuestions } from "./DocumentQuestions";
import { QuestionsButtonTextInput, QuestionsDraft } from "./QuestionsView";

export const QuestionsBlock = (props: BlockProps & { preview?: boolean }) => {
  let isSelected = useIsBlockSelected(props.entityID);
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let buttonText =
    useEntity(props.entityID, "questions/button-text")?.data.value ?? "";
  let { data, normalizedDocument } = useLeafletPublicationData();
  let documentUri = data?.documents?.uri;

  // Readers can only ask once the published document carries the block, so
  // a block added since the last publish is still a draft.
  let isPublished =
    !!normalizedDocument &&
    documentHasBlock(normalizedDocument, ids.PubLeafletBlocksQuestions);

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
    <BlockLayout isSelected={!!isSelected} className="questionsBlock">
      {isPublished && documentUri && !props.preview ? (
        <DocumentQuestions
          documentUri={documentUri}
          editor={{
            blockEntity: props.entityID,
            page: pageOfParent(props.parent),
            action: button,
          }}
        />
      ) : (
        <QuestionsDraft action={button} />
      )}
    </BlockLayout>
  );
};
