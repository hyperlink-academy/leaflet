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
  LinkSmall,
  BlockEmbedSmall,
  BlockButtonSmall,
  BlockCalendarSmall,
  RSVPSmall,
} from "components/Icons";
import { generateKeyBetween } from "fractional-indexing";
import { focusPage } from "components/Pages";
import { v7 } from "uuid";
import { Replicache } from "replicache";
import { keepFocus } from "components/Toolbar/TextBlockTypeToolbar";
import { useEditorStates } from "src/state/useEditorState";
import { elementId } from "src/utils/elementId";
import { UndoManager } from "src/undoManager";
import { focusBlock } from "src/utils/focusBlock";

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
      return s;
    }

    let tr = existingState.editor.tr;
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
    undoManager: UndoManager,
  ) => Promise<any>;
};
export const blockCommands: Command[] = [
  // please keep these in the order that they appear in the menu, grouped by type
  {
    name: "Text",
    icon: <ParagraphSmall />,
    type: "text",
    onSelect: async (rep, props, um) => {
      props.entityID && clearCommandSearchText(props.entityID);
      let entity = await createBlockWithType(rep, props, "text");
      clearCommandSearchText(entity);
      um.add({
        undo: () => {
          keepFocus(entity);
        },
        redo: () => {
          keepFocus(entity);
        },
      });

      keepFocus(entity);
    },
  },
  {
    name: "Title",
    icon: <Header1Small />,
    type: "text",
    onSelect: async (rep, props, um) => {
      let entity = await createBlockWithType(rep, props, "heading");
      await rep.mutate.assertFact({
        entity,
        attribute: "block/heading-level",
        data: { type: "number", value: 1 },
      });
      clearCommandSearchText(entity);
      um.add({
        undo: () => {
          keepFocus(entity);
        },
        redo: () => {
          keepFocus(entity);
        },
      });

      keepFocus(entity);
    },
  },
  {
    name: "Header",
    icon: <Header2Small />,
    type: "text",
    onSelect: async (rep, props, um) => {
      let entity = await createBlockWithType(rep, props, "heading");
      await rep.mutate.assertFact({
        entity,
        attribute: "block/heading-level",
        data: { type: "number", value: 2 },
      });
      um.add({
        undo: () => {
          keepFocus(entity);
        },
        redo: () => {
          keepFocus(entity);
        },
      });
      clearCommandSearchText(entity);
      keepFocus(entity);
    },
  },
  {
    name: "Subheader",
    icon: <Header3Small />,
    type: "text",
    onSelect: async (rep, props, um) => {
      let entity = await createBlockWithType(rep, props, "heading");
      await rep.mutate.assertFact({
        entity,
        attribute: "block/heading-level",
        data: { type: "number", value: 3 },
      });
      um.add({
        undo: () => {
          keepFocus(entity);
        },
        redo: () => {
          keepFocus(entity);
        },
      });
      clearCommandSearchText(entity);
      keepFocus(entity);
    },
  },

  {
    name: "External Link",
    icon: <LinkSmall />,
    type: "block",
    onSelect: async (rep, props, um) => {
      props.entityID && clearCommandSearchText(props.entityID);
      await createBlockWithType(rep, props, "link");
      um.add({
        undo: () => {
          props.entityID && keepFocus(props.entityID);
        },
        redo: () => {},
      });
    },
  },
  {
    name: "Embed Website",
    icon: <BlockEmbedSmall />,
    type: "block",
    onSelect: async (rep, props, um) => {
      props.entityID && clearCommandSearchText(props.entityID);
      await createBlockWithType(rep, props, "embed");
      um.add({
        undo: () => {
          props.entityID && keepFocus(props.entityID);
        },
        redo: () => {},
      });
    },
  },
  {
    name: "Image",
    icon: <BlockImageSmall />,
    type: "block",
    onSelect: async (rep, props, um) => {
      props.entityID && clearCommandSearchText(props.entityID);
      let entity = await createBlockWithType(rep, props, "image");
      setTimeout(() => {
        let el = document.getElementById(elementId.block(entity).input);
        el?.focus();
      }, 100);
      um.add({
        undo: () => {
          keepFocus(entity);
        },
        redo: () => {
          let el = document.getElementById(elementId.block(entity).input);
          el?.focus();
        },
      });
    },
  },
  {
    name: "Button",
    icon: <BlockButtonSmall />,
    type: "block",
    onSelect: async (rep, props, um) => {
      props.entityID && clearCommandSearchText(props.entityID);
      await createBlockWithType(rep, props, "button");
      um.add({
        undo: () => {
          props.entityID && keepFocus(props.entityID);
        },
        redo: () => {},
      });
    },
  },
  {
    name: "Mailbox",
    icon: <BlockMailboxSmall />,
    type: "block",
    onSelect: async (rep, props) => {
      props.entityID && clearCommandSearchText(props.entityID);
      await createBlockWithType(rep, props, "mailbox");
    },
  },

  // EVENT STUFF

  {
    name: "RSVP",
    icon: <RSVPSmall />,
    type: "event",
    onSelect: (rep, props) => {
      props.entityID && clearCommandSearchText(props.entityID);
      return createBlockWithType(rep, props, "rsvp");
    },
  },
  {
    name: "Date and Time",
    icon: <BlockCalendarSmall />,
    type: "event",
    onSelect: (rep, props) => {
      props.entityID && clearCommandSearchText(props.entityID);
      return createBlockWithType(rep, props, "datetime");
    },
  },

  // PAGE TYPES

  {
    name: "New Page",
    icon: <BlockDocPageSmall />,
    type: "page",
    onSelect: async (rep, props, um) => {
      props.entityID && clearCommandSearchText(props.entityID);
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
      um.add({
        undo: () => {
          useUIState.getState().closePage(newPage);
          setTimeout(
            () =>
              focusBlock(
                { parent: props.parent, value: entity, type: "text" },
                { type: "end" },
              ),
            100,
          );
        },
        redo: () => {
          useUIState.getState().openPage(props.parent, newPage);
          focusPage(newPage, rep, "focusFirstBlock");
        },
      });
      focusPage(newPage, rep, "focusFirstBlock");
    },
  },
  {
    name: "New Canvas",
    icon: <BlockCanvasPageSmall />,
    type: "page",
    onSelect: async (rep, props, um) => {
      props.entityID && clearCommandSearchText(props.entityID);
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
      um.add({
        undo: () => {
          useUIState.getState().closePage(newPage);
          setTimeout(
            () =>
              focusBlock(
                { parent: props.parent, value: entity, type: "text" },
                { type: "end" },
              ),
            100,
          );
        },
        redo: () => {
          useUIState.getState().openPage(props.parent, newPage);
          focusPage(newPage, rep, "focusFirstBlock");
        },
      });
    },
  },
];
