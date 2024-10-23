import { Fact, ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";
import {
  BlockDocPageSmall,
  BlockCanvasPageSmall,
  BlockImageSmall,
  Header1Small,
  Header2Small,
  Header3Small,
  BlockMailboxSmall,
  ParagraphSmall,
  DiscussionSmall,
  LinkSmall,
  BlockEmbedSmall,
} from "components/Icons";
import { generateKeyBetween } from "fractional-indexing";
import { focusPage } from "components/Pages";
import { v7 } from "uuid";
import { Replicache } from "replicache";
import { keepFocus } from "components/Toolbar/TextBlockTypeToolbar";
import { useEditorStates } from "src/state/useEditorState";
import { elementId } from "src/utils/elementId";

type Props = {
  parent: string;
  entityID: string | null;
  position: string | null;
  nextPosition: string | null;
  factID?: string | undefined;
  first?: boolean;
  className?: string;
};

async function createBlockWithType(
  rep: Replicache<ReplicacheMutators>,
  args: {
    entity_set: string;
    parent: string;
    position: string | null;
    nextPosition: string | null;
    entityID: string | null;
  },
  type: Fact<"block/type">["data"]["value"],
) {
  let entity;

  if (!args.entityID) {
    entity = v7();
    await rep?.mutate.addBlock({
      parent: args.parent,
      factID: v7(),
      permission_set: args.entity_set,
      type: type,
      position: generateKeyBetween(args.position, args.nextPosition),
      newEntityID: entity,
    });
  } else {
    entity = args.entityID;
    await rep?.mutate.assertFact({
      entity,
      attribute: "block/type",
      data: { type: "block-type-union", value: type },
    });
  }
  return entity;
}

function clearCommandSearchText(entityID: string) {
  useEditorStates.setState((s) => {
    let existingState = s.editorStates[entityID];
    if (!existingState) {
      console.log("no existing state???");
      return s;
    }

    let tr = existingState.editor.tr;
    console.log("deleting!");
    tr.deleteRange(1, tr.doc.content.size - 1);
    return {
      editorStates: {
        ...s.editorStates,
        [entityID]: {
          ...existingState,
          editor: existingState.editor.apply(tr),
        },
      },
    };
  });
}

type Command = {
  name: string;
  icon: React.ReactNode;
  type: string;
  onSelect: (
    rep: Replicache<ReplicacheMutators>,
    props: Props & { entity_set: string },
  ) => void;
};
export const blockCommands: Command[] = [
  // please keep these in this order!!! This is the order in which the appear in the menu, grouped by type
  {
    name: "Text",
    icon: <ParagraphSmall />,
    type: "text",
    onSelect: async (rep, props) => {
      props.entityID && clearCommandSearchText(props.entityID);
      let entity = await createBlockWithType(rep, props, "text");
      clearCommandSearchText(entity);
      keepFocus(entity);
    },
  },
  {
    name: "Title",
    icon: <Header1Small />,
    type: "text",
    onSelect: async (rep, props) => {
      props.entityID && clearCommandSearchText(props.entityID);
      let entity = await createBlockWithType(rep, props, "heading");
      await rep.mutate.assertFact({
        entity,
        attribute: "block/heading-level",
        data: { type: "number", value: 1 },
      });

      keepFocus(entity);
    },
  },
  {
    name: "Header",
    icon: <Header2Small />,
    type: "text",
    onSelect: async (rep, props) => {
      props.entityID && clearCommandSearchText(props.entityID);
      let entity = await createBlockWithType(rep, props, "heading");
      rep.mutate.assertFact({
        entity,
        attribute: "block/heading-level",
        data: { type: "number", value: 2 },
      });
      clearCommandSearchText(entity);
      keepFocus(entity);
    },
  },
  {
    name: "Subheader",
    icon: <Header3Small />,
    type: "text",
    onSelect: async (rep, props) => {
      props.entityID && clearCommandSearchText(props.entityID);
      let entity = await createBlockWithType(rep, props, "heading");
      rep.mutate.assertFact({
        entity,
        attribute: "block/heading-level",
        data: { type: "number", value: 3 },
      });
      clearCommandSearchText(entity);
      keepFocus(entity);
    },
  },

  {
    name: "External Link",
    icon: <LinkSmall />,
    type: "block",
    onSelect: async (rep, props) => {
      createBlockWithType(rep, props, "link");
    },
  },
  {
    name: "Embed Website",
    icon: <BlockEmbedSmall />,
    type: "block",
    onSelect: async (rep, props) => {
      createBlockWithType(rep, props, "embed");
    },
  },
  {
    name: "Image",
    icon: <BlockImageSmall />,
    type: "block",
    onSelect: async (rep, props) => {
      let entity = await createBlockWithType(rep, props, "image");
      setTimeout(() => {
        let el = document.getElementById(elementId.block(entity).input);
        console.log(el);
        el?.focus();
      }, 100);
    },
  },

  {
    name: "Mailbox",
    icon: <BlockMailboxSmall />,
    type: "block",
    onSelect: async (rep, props) => {
      let entity;
      createBlockWithType(rep, props, "mailbox");
    },
  },

  {
    name: "New Page",
    icon: <BlockDocPageSmall />,
    type: "page",
    onSelect: async (rep, props) => {
      let entity = await createBlockWithType(rep, props, "card");

      let newPage = v7();
      await rep?.mutate.addPageLinkBlock({
        blockEntity: entity,
        firstBlockFactID: v7(),
        firstBlockEntity: v7(),
        pageEntity: newPage,
        type: "doc",
        permission_set: props.entity_set,
      });
      useUIState.getState().openPage(props.parent, newPage);
      focusPage(newPage, rep, "focusFirstBlock");
    },
  },
  {
    name: "New Canvas",
    icon: <BlockCanvasPageSmall />,
    type: "page",
    onSelect: async (rep, props) => {
      let entity = await createBlockWithType(rep, props, "card");

      let newPage = v7();
      await rep?.mutate.addPageLinkBlock({
        type: "canvas",
        blockEntity: entity,
        firstBlockFactID: v7(),
        firstBlockEntity: v7(),
        pageEntity: newPage,
        permission_set: props.entity_set,
      });
      useUIState.getState().openPage(props.parent, newPage);
      focusPage(newPage, rep, "focusFirstBlock");
    },
  },

  {
    name: "New Discussion",
    icon: <DiscussionSmall />,
    type: "page",
    onSelect: async (rep, props) => {
      let entity = await createBlockWithType(rep, props, "card");

      let newPage = v7();
      await rep?.mutate.addPageLinkBlock({
        type: "discussion",
        blockEntity: entity,
        firstBlockFactID: v7(),
        firstBlockEntity: v7(),
        pageEntity: newPage,
        permission_set: props.entity_set,
      });
      useUIState.getState().openPage(props.parent, newPage);
      focusPage(newPage, rep);
    },
  },
];
