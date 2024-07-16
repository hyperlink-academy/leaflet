import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import {
  BlockCardSmall,
  BlockImageSmall,
  BlockLinkSmall,
  CheckTiny,
  CloseTiny,
  Header1Small,
  Header2Small,
  Header3Small,
  LinkSmall,
  LinkTextToolbarSmall,
  ParagraphSmall,
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
import { ToolbarButton } from "components/Toolbar";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  TextBlockTypeButton,
  TextBlockTypeButtons,
} from "components/Toolbar/TextBlockTypeButtons";

type Props = {
  parent: string;
  entityID: string | null;
  position: string | null;
  nextPosition: string | null;
  factID?: string | undefined;
  first?: boolean;
  className?: string;
};
export function BlockOptions(props: Props) {
  let { rep } = useReplicache();
  let entity_set = useEntitySetContext();
  let [blockMenuState, setblockMenuState] = useState<
    "default" | "link" | "heading"
  >("default");

  let focusedElement = useUIState((s) => s.focusedBlock);
  let focusedCardID =
    focusedElement?.type === "card"
      ? focusedElement.entityID
      : focusedElement?.parent;

  let type = useEntity(props.entityID, "block/type");

  return (
    <Tooltip.Provider>
      <div
        className={`blockOptionsWrapper hidden w-fit max-h-9 sm:group-hover/text:flex  group-focus-within/text:flex  place-items-center ${props.className}`}
      >
        <div className="blockOptionsdefaultContent flex gap-1 items-center">
          {blockMenuState === "default" && (
            <>
              <ToolbarButton
                tooltipContent="Add an Image"
                className="text-tertiary"
              >
                <label onMouseDown={(e) => e.preventDefault()}>
                  <BlockImageSmall />
                  <div className="hidden">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        let file = e.currentTarget.files?.[0];
                        if (!file || !rep) return;
                        if (props.factID)
                          await rep.mutate.retractFact({
                            factID: props.factID,
                          });
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
              </ToolbarButton>
              <ToolbarButton
                tooltipContent="Add a Link"
                className="text-tertiary"
                onClick={() => {
                  setblockMenuState("link");
                }}
              >
                <LinkTextToolbarSmall />
              </ToolbarButton>
              <ToolbarButton
                tooltipContent="Add a card"
                className=" text-tertiary"
                onClick={async () => {
                  let entity;
                  if (!props.entityID) {
                    entity = v7();

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
                  } else {
                    entity = props.entityID;
                    await rep?.mutate.assertFact({
                      entity,
                      attribute: "block/type",
                      data: { type: "block-type-union", value: "card" },
                    });
                  }
                  let newCard = v7();
                  await rep?.mutate.addCardBlock({
                    blockEntity: entity,
                    firstBlockEntity: v7(),
                    cardEntity: newCard,
                    permission_set: entity_set.set,
                  });
                  useUIState.getState().openCard(props.parent, newCard);
                  if (rep) focusCard(newCard, rep, "focusFirstBlock");
                }}
              >
                <BlockCardSmall />
              </ToolbarButton>
              <Separator classname="h-6" />
              <TextBlockTypeButton
                className="hover:text-primary text-tertiary "
                setToolbarState={() => setblockMenuState("heading")}
              />
            </>
          )}
          {blockMenuState === "heading" && (
            <>
              <TextBlockTypeButtons
                className="bg-transparent hover:text-primary text-tertiary "
                onClose={() => setblockMenuState("default")}
              />
              <Separator classname="h-6" />
              <button
                className="hover:text-accent-contrast"
                onClick={() => setblockMenuState("default")}
              >
                <CloseTiny />
              </button>
            </>
          )}
          {blockMenuState === "link" && (
            <>
              <BlockLinkInput
                onClose={() => {
                  setblockMenuState("default");
                }}
                {...props}
              />
            </>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
}

const BlockLinkInput = (props: { onClose: () => void } & Props) => {
  let entity_set = useEntitySetContext();
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
    let link = linkValue;
    if (!linkValue.startsWith("http")) link = `https://${linkValue}`;
    addLinkBlock(link, entity, rep);
    props.onClose();
  };

  return (
    <div className={`max-w-sm flex gap-2 rounded-md text-secondary`}>
      <>
        <BlockLinkSmall className="shrink-0" />
        <Separator />
        <Input
          autoFocus
          type="url"
          className="w-full grow border-none outline-none bg-transparent "
          placeholder="www.example.com"
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          onBlur={() => props.onClose()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submit();
            }
          }}
        />
        <div className="flex items-center gap-3 ">
          <button
            className="hover:text-accent-contrast"
            onMouseDown={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <CheckTiny />
          </button>
          <button
            className="hover:text-accent-contrast"
            onClick={() => props.onClose()}
          >
            <CloseTiny />
          </button>
        </div>
      </>
    </div>
  );
};
