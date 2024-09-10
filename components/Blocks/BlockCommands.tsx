import { ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";
import {
  BlockPageLinkSmall,
  BlockImageSmall,
  BlockLinkSmall,
  Header1Small,
  Header2Small,
  Header3Small,
  MailboxSmall,
  ParagraphSmall,
} from "components/Icons";
import { generateKeyBetween } from "fractional-indexing";
import { focusPage } from "components/Pages";
import { v7 } from "uuid";
import { Replicache } from "replicache";

type Props = {
  parent: string;
  entityID: string | null;
  position: string | null;
  nextPosition: string | null;
  factID?: string | undefined;
  first?: boolean;
  className?: string;
};

export const blockCommands = [
  // please keep these in the order that they appear in the menu, grouped by type
  { name: "Text", icon: <ParagraphSmall />, type: "text", onSelect: () => {} },
  { name: "Title", icon: <Header1Small />, type: "text", onSelect: () => {} },
  { name: "Header", icon: <Header2Small />, type: "text", onSelect: () => {} },
  {
    name: "Subheader",
    icon: <Header3Small />,
    type: "text",
    onSelect: () => {},
  },

  {
    name: "External Link",
    icon: <BlockLinkSmall />,
    type: "block",
    onSelect: () => {},
  },
  {
    name: "Image",
    icon: <BlockImageSmall />,
    type: "block",
    onSelect: () => {},
  },
  {
    name: "Mailbox",
    icon: <MailboxSmall />,
    type: "block",
    onSelect: async (
      props: {
        entity_set: { set: string };
        rep: Replicache<ReplicacheMutators>;
      } & Props,
    ) => {
      let entity;

      if (!props.entityID) {
        entity = v7();
        await props.rep?.mutate.addBlock({
          parent: props.parent,
          factID: v7(),
          permission_set: props.entity_set.set,
          type: "mailbox",
          position: generateKeyBetween(props.position, props.nextPosition),
          newEntityID: entity,
        });
      } else {
        entity = props.entityID;
        await props.rep?.mutate.assertFact({
          entity,
          attribute: "block/type",
          data: { type: "block-type-union", value: "mailbox" },
        });
      }
    },
  },

  {
    name: "New Page",
    icon: <BlockPageLinkSmall />,
    type: "page",
    onSelect: async (
      props: {
        entity_set: { set: string };
        rep: Replicache<ReplicacheMutators>;
      } & Props,
    ) => {
      let entity;

      if (!props.entityID) {
        entity = v7();

        await props.rep?.mutate.addBlock({
          permission_set: props.entity_set.set,
          factID: v7(),
          parent: props.parent,
          type: "card",
          position: generateKeyBetween(props.position, props.nextPosition),
          newEntityID: entity,
        });
      } else {
        entity = props.entityID;
        await props.rep?.mutate.assertFact({
          entity,
          attribute: "block/type",
          data: { type: "block-type-union", value: "card" },
        });
      }
      let newPage = v7();
      await props.rep?.mutate.addPageLinkBlock({
        blockEntity: entity,
        firstBlockFactID: v7(),
        firstBlockEntity: v7(),
        pageEntity: newPage,
        permission_set: props.entity_set.set,
      });
      useUIState.getState().openPage(props.parent, newPage);
      if (props.rep) focusPage(newPage, props.rep, "focusFirstBlock");
    },
  },
  {
    name: "New Canvas",
    icon: <BlockPageLinkSmall />,
    type: "page",
    onSelect: () => {},
  },
];
