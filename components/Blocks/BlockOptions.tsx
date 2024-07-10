import { useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import {
  BlockCardSmall,
  BlockImageSmall,
  BlockLinkSmall,
  CheckTiny,
  CloseTiny,
} from "components/Icons";
import { generateKeyBetween } from "fractional-indexing";
import { addImage } from "src/utils/addImage";
import { focusCard } from "components/Cards";
import { useState } from "react";
import { Separator } from "components/Layout";
import { addLinkBlock } from "src/utils/addLinkBlock";
import { useEntitySetContext } from "components/EntitySetProvider";
import { v7 } from "uuid";
import { Input } from "components/Input";

type Props = {
  parent: string;
  entityID: string | null;
  position: string | null;
  nextPosition: string | null;
  factID?: string | undefined;
  first?: boolean;
};
export function BlockOptions(props: Props) {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();

  let focusedElement = useUIState((s) => s.focusedBlock);
  let focusedCardID =
    focusedElement?.type === "card"
      ? focusedElement.entityID
      : focusedElement?.parent;

  return (
    <div
      className={`blockOptionsWrapper sm:group-hover/text:block group-focus-within/text:block hidden
 absolute right-2 sm:right-3 ${props.first ? "top-2 sm:top-3" : "top-1"}`}
    >
      <div className="blockOptionsContent flex gap-1 items-center">
        <label
          className="blockOptionsImage hover:cursor-pointer flex place-items-center"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="text-tertiary hover:text-accent ">
            <BlockImageSmall />
          </div>
          <div className="hidden">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                let file = e.currentTarget.files?.[0];
                if (!file || !rep) return;
                if (props.factID)
                  await rep.mutate.retractFact({ factID: props.factID });
                let entity = props.entityID;
                if (!entity) {
                  entity = v7();
                  await rep?.mutate.addBlock({
                    parent: props.parent,
                    permission_set: entity_set.set,
                    type: "text",
                    position: generateKeyBetween(
                      props.position,
                      props.nextPosition,
                    ),
                    newEntityID: entity,
                  });
                }
                await rep.mutate.assertFact({
                  entity,
                  attribute: "block/type",
                  data: { type: "block-type-union", value: "image" },
                });
                await addImage(file, rep, {
                  entityID: entity,
                  attribute: "block/image",
                });
              }}
            />
          </div>
        </label>
        <BlockLinkButton {...props} />

        <button
          className="blockOptionsCard text-tertiary hover:text-accent"
          onMouseDown={(e) => e.preventDefault()}
          onClick={async () => {
            if (!props.entityID) {
              let entity = v7();

              await rep?.mutate.addBlock({
                permission_set: entity_set.set,
                parent: props.parent,
                type: "card",
                position: generateKeyBetween(
                  props.position,
                  props.nextPosition,
                ),
                newEntityID: entity,
              });
              useUIState.getState().openCard(props.parent, entity);
              if (rep) focusCard(entity, rep);
            } else {
              await rep?.mutate.assertFact({
                entity: props.entityID,
                attribute: "block/type",
                data: { type: "block-type-union", value: "card" },
              });
              let entityID = v7();
              await rep?.mutate.addBlock({
                parent: props.entityID,
                position: "a0",
                newEntityID: entityID,
                type: "text",
                permission_set: entity_set.set,
              });
              useUIState.getState().openCard(props.parent, props.entityID);
              if (rep) focusCard(props.entityID, rep, "focusFirstBlock");
            }
          }}
        >
          <BlockCardSmall />
        </button>
      </div>
    </div>
  );
}

const BlockLinkButton = (props: Props) => {
  let entity_set = useEntitySetContext();
  let [linkOpen, setLinkOpen] = useState(false);
  let [linkValue, setLinkValue] = useState("");
  let { rep } = useReplicache();
  let submit = async () => {
    let entity = props.entityID;
    if (!entity) {
      entity = v7();

      await rep?.mutate.addBlock({
        permission_set: entity_set.set,
        parent: props.parent,
        type: "card",
        position: generateKeyBetween(props.position, props.nextPosition),
        newEntityID: entity,
      });
    }
    addLinkBlock(linkValue, entity, rep);
    setLinkOpen(false);
  };

  return (
    <div
      className={`max-w-sm flex gap-2 hover:text-accent rounded-md ${linkOpen ? "text-secondary" : " text-tertiary"}`}
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setLinkOpen(!linkOpen);
        }}
      >
        <BlockLinkSmall />
      </button>
      {linkOpen && (
        <>
          <Separator />
          <Input
            autoFocus
            type="url"
            className="w-full grow border-none outline-none bg-transparent "
            placeholder="add a link..."
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onBlur={() => setLinkOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submit();
              }
            }}
          />
          <div className="flex items-center gap-3 ">
            <button
              className="hover:text-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <CheckTiny />
            </button>
            <button
              className="hover:text-accent"
              onClick={() => setLinkOpen(false)}
            >
              <CloseTiny />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
