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
  MailboxSmall,
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
  TextBlockTypeToolbar,
} from "components/Toolbar/TextBlockTypeToolbar";
import { isUrl } from "src/utils/isURL";
import { useSmoker, useToaster } from "components/Toast";

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

  let focusedElement = useUIState((s) => s.focusedEntity);
  let focusedCardID =
    focusedElement?.entityType === "card"
      ? focusedElement.entityID
      : focusedElement?.parent;

  let type = useEntity(props.entityID, "block/type");

  return (
    <Tooltip.Provider>
      <div
        className={`blockOptionsWrapper w-fit hidden sm:group-hover/text:flex  group-focus-within/text:flex  place-items-center ${props.className}`}
      >
        <div className="blockOptionsdefaultContent flex gap-1 items-center">
          {blockMenuState === "default" && (
            <>
              <ToolbarButton
                tooltipContent="Add an Image"
                className="text-tertiary h-6"
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
                            factID: v7(),
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
                tooltipContent="Add a card"
                className="text-tertiary h-6"
                onClick={async () => {
                  let entity;
                  if (!props.entityID) {
                    entity = v7();

                    await rep?.mutate.addBlock({
                      permission_set: entity_set.set,
                      factID: v7(),
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
                    firstBlockFactID: v7(),
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
              <ToolbarButton
                tooltipContent="Add a Link"
                className="text-tertiary h-6"
                onClick={() => {
                  setblockMenuState("link");
                }}
              >
                <LinkTextToolbarSmall />
              </ToolbarButton>

              <ToolbarButton
                tooltipContent="Add a Mailbox"
                className="text-tertiary h-6"
                onClick={async () => {
                  let entity;
                  if (!props.entityID) {
                    entity = v7();
                    await rep?.mutate.addBlock({
                      parent: props.parent,
                      factID: v7(),
                      permission_set: entity_set.set,
                      type: "mailbox",
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
                      data: { type: "block-type-union", value: "mailbox" },
                    });
                  }
                }}
              >
                <MailboxSmall />
              </ToolbarButton>
              <button
                onClick={async () => {
                  let entity;
                  if (!props.entityID) {
                    entity = v7();
                    await rep?.mutate.addBlock({
                      parent: props.parent,
                      factID: v7(),
                      permission_set: entity_set.set,
                      type: "collection",
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
                      data: { type: "block-type-union", value: "collection" },
                    });
                  }
                }}
              >
                Collection
              </button>
              <Separator classname="h-6" />
              <TextBlockTypeButton
                className="hover:text-primary text-tertiary h-6"
                setToolbarState={() => setblockMenuState("heading")}
              />
            </>
          )}
          {blockMenuState === "heading" && (
            <>
              <TextBlockTypeToolbar
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
        factID: v7(),
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
  let smoke = useSmoker();

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
              if (!linkValue) return;
              if (!isUrl(linkValue)) {
                let rect = e.currentTarget.getBoundingClientRect();
                smoke({
                  error: true,
                  text: "invalid url!",
                  position: { x: rect.left, y: rect.top - 8 },
                });
                return;
              }
              submit();
            }
          }}
        />
        <div className="flex items-center gap-3 ">
          <button
            disabled={!linkValue || linkValue === ""}
            className="hover:text-accent-contrast disabled:text-border"
            onMouseDown={(e) => {
              e.preventDefault();
              if (!linkValue) return;
              if (!isUrl(linkValue)) {
                smoke({
                  error: true,
                  text: "invalid url!",
                  position: { x: e.clientX, y: e.clientY },
                });
                return;
              }
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
