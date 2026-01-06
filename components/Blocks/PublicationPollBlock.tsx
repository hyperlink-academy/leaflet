import { useUIState } from "src/useUIState";
import { BlockLayout, BlockProps } from "./Block";
import { useMemo } from "react";
import { AsyncValueInput } from "components/Input";
import { focusElement } from "src/utils/focusElement";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useEntity, useReplicache } from "src/replicache";
import { v7 } from "uuid";
import { elementId } from "src/utils/elementId";
import { CloseTiny } from "components/Icons/CloseTiny";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import {
  PubLeafletBlocksPoll,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { ids } from "lexicons/api/lexicons";

/**
 * PublicationPollBlock is used for editing polls in publication documents.
 * It allows adding/editing options when the poll hasn't been published yet,
 * but disables adding new options once the poll record exists (indicated by pollUri).
 */
export const PublicationPollBlock = (props: BlockProps) => {
  let { data: publicationData } = useLeafletPublicationData();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  // Check if this poll has been published in a publication document
  const isPublished = useMemo(() => {
    if (!publicationData?.documents?.data) return false;

    const docRecord = publicationData.documents
      .data as PubLeafletDocument.Record;

    // Search through all pages and blocks to find if this poll entity has been published
    for (const page of docRecord.pages || []) {
      if (page.$type === "pub.leaflet.pages.linearDocument") {
        const linearPage = page as PubLeafletPagesLinearDocument.Main;
        for (const blockWrapper of linearPage.blocks || []) {
          if (blockWrapper.block?.$type === ids.PubLeafletBlocksPoll) {
            const pollBlock = blockWrapper.block as PubLeafletBlocksPoll.Main;
            // Check if this poll's rkey matches our entity ID
            const rkey = pollBlock.pollRef.uri.split("/").pop();
            if (rkey === props.entityID) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }, [publicationData, props.entityID]);

  return (
    <BlockLayout
      className="poll flex flex-col gap-2"
      hasBackground={"accent"}
      isSelected={!!isSelected}
    >
      <EditPollForPublication
        entityID={props.entityID}
        isPublished={isPublished}
      />
    </BlockLayout>
  );
};

const EditPollForPublication = (props: {
  entityID: string;
  isPublished: boolean;
}) => {
  let pollOptions = useEntity(props.entityID, "poll/options");
  let { rep } = useReplicache();
  let permission_set = useEntitySetContext();

  return (
    <>
      {props.isPublished && (
        <div className="text-sm italic text-tertiary">
          This poll has been published. You can't edit the options.
        </div>
      )}

      {pollOptions.length === 0 && !props.isPublished && (
        <div className="text-center italic text-tertiary text-sm">
          no options yet...
        </div>
      )}

      {pollOptions.map((p) => (
        <EditPollOptionForPublication
          key={p.id}
          entityID={p.data.value}
          pollEntity={props.entityID}
          disabled={props.isPublished}
          canDelete={!props.isPublished}
        />
      ))}

      {!props.isPublished && permission_set.permissions.write && (
        <button
          className="pollAddOption w-fit flex gap-2 items-center justify-start text-sm text-accent-contrast"
          onClick={async () => {
            let pollOptionEntity = v7();
            await rep?.mutate.addPollOption({
              pollEntity: props.entityID,
              pollOptionEntity,
              pollOptionName: "",
              permission_set: permission_set.set,
              factID: v7(),
            });

            focusElement(
              document.getElementById(
                elementId.block(props.entityID).pollInput(pollOptionEntity),
              ) as HTMLInputElement | null,
            );
          }}
        >
          Add an Option
        </button>
      )}
    </>
  );
};

const EditPollOptionForPublication = (props: {
  entityID: string;
  pollEntity: string;
  disabled: boolean;
  canDelete: boolean;
}) => {
  let { rep } = useReplicache();
  let { permissions } = useEntitySetContext();
  let optionName = useEntity(props.entityID, "poll-option/name")?.data.value;

  return (
    <div className="flex gap-2 items-center">
      <AsyncValueInput
        id={elementId.block(props.pollEntity).pollInput(props.entityID)}
        type="text"
        className="pollOptionInput w-full input-with-border"
        placeholder="Option here..."
        disabled={props.disabled || !permissions.write}
        value={optionName || ""}
        onChange={async (e) => {
          await rep?.mutate.assertFact([
            {
              entity: props.entityID,
              attribute: "poll-option/name",
              data: { type: "string", value: e.currentTarget.value },
            },
          ]);
        }}
        onKeyDown={(e) => {
          if (
            props.canDelete &&
            e.key === "Backspace" &&
            !e.currentTarget.value
          ) {
            e.preventDefault();
            rep?.mutate.removePollOption({ optionEntity: props.entityID });
          }
        }}
      />

      {permissions.write && props.canDelete && (
        <button
          tabIndex={-1}
          className="text-accent-contrast"
          onMouseDown={async () => {
            await rep?.mutate.removePollOption({
              optionEntity: props.entityID,
            });
          }}
        >
          <CloseTiny />
        </button>
      )}
    </div>
  );
};
