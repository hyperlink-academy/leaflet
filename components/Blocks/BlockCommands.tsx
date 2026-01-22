import type { Fact, ReplicacheMutators } from "src/replicache";
import { useUIState } from "src/useUIState";

import { generateKeyBetween } from "fractional-indexing";
import { focusPage } from "src/utils/focusPage";
import { v7 } from "uuid";
import { Replicache } from "replicache";
import { useEditorStates } from "src/state/useEditorState";
import { elementId } from "src/utils/elementId";
import { UndoManager } from "src/undoManager";
import { focusBlock } from "src/utils/focusBlock";
import { usePollBlockUIState } from "./PollBlock/pollBlockState";
import { focusElement } from "src/utils/focusElement";
import { BlockBlueskySmall } from "components/Icons/BlockBlueskySmall";
import { BlockButtonSmall } from "components/Icons/BlockButtonSmall";
import { BlockCalendarSmall } from "components/Icons/BlockCalendarSmall";
import { BlockCanvasPageSmall } from "components/Icons/BlockCanvasPageSmall";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { BlockEmbedSmall } from "components/Icons/BlockEmbedSmall";
import { BlockImageSmall } from "components/Icons/BlockImageSmall";
import { BlockMailboxSmall } from "components/Icons/BlockMailboxSmall";
import { BlockPollSmall } from "components/Icons/BlockPollSmall";
import {
  ParagraphSmall,
  Header1Small,
  Header2Small,
  Header3Small,
} from "components/Icons/BlockTextSmall";
import { LinkSmall } from "components/Icons/LinkSmall";
import { BlockRSVPSmall } from "components/Icons/BlockRSVPSmall";
import { ListUnorderedSmall, ListOrderedSmall } from "components/Toolbar/ListToolbar";
import { BlockMathSmall } from "components/Icons/BlockMathSmall";
import { BlockCodeSmall } from "components/Icons/BlockCodeSmall";
import { QuoteSmall } from "components/Icons/QuoteSmall";
import { LAST_USED_CODE_LANGUAGE_KEY } from "src/utils/codeLanguageStorage";

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
  alternateNames?: string[];
  hiddenInPublication?: boolean;
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
    },
  },
  {
    name: "Title",
    icon: <Header1Small />,
    type: "text",
    alternateNames: ["h1"],
    onSelect: async (rep, props, um) => {
      await setHeaderCommand(1, rep, props);
    },
  },
  {
    name: "Header",
    icon: <Header2Small />,
    type: "text",
    alternateNames: ["h2"],
    onSelect: async (rep, props, um) => {
      await setHeaderCommand(2, rep, props);
    },
  },
  {
    name: "Subheader",
    icon: <Header3Small />,
    type: "text",
    alternateNames: ["h3"],
    onSelect: async (rep, props, um) => {
      await setHeaderCommand(3, rep, props);
    },
  },
  {
    name: "Unordered List",
    icon: <ListUnorderedSmall />,
    type: "text",
    onSelect: async (rep, props, um) => {
      let entity = await createBlockWithType(rep, props, "text");
      await rep?.mutate.assertFact({
        entity,
        attribute: "block/is-list",
        data: { value: true, type: "boolean" },
      });
      clearCommandSearchText(entity);
    },
  },
  {
    name: "Ordered List",
    icon: <ListOrderedSmall />,
    type: "text",
    onSelect: async (rep, props, um) => {
      let entity = await createBlockWithType(rep, props, "text");
      await rep?.mutate.assertFact([
        {
          entity,
          attribute: "block/is-list",
          data: { value: true, type: "boolean" },
        },
        {
          entity,
          attribute: "block/list-style",
          data: { value: "ordered", type: "list-style-union" },
        },
        {
          entity,
          attribute: "block/list-number",
          data: { value: 1, type: "number" },
        },
      ]);
      clearCommandSearchText(entity);
    },
  },
  {
    name: "Block Quote",
    icon: <QuoteSmall />,
    type: "text",
    onSelect: async (rep, props, um) => {
      if (props.entityID) clearCommandSearchText(props.entityID);
      let entity = await createBlockWithType(rep, props, "blockquote");
      clearCommandSearchText(entity);
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
          focusTextBlock(entity);
        },
        redo: () => {
          let el = document.getElementById(elementId.block(entity).input);
          el?.focus();
        },
      });
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
    name: "Button",
    icon: <BlockButtonSmall />,
    type: "block",
    onSelect: async (rep, props, um) => {
      props.entityID && clearCommandSearchText(props.entityID);
      await createBlockWithType(rep, props, "button");
      um.add({
        undo: () => {
          props.entityID && focusTextBlock(props.entityID);
        },
        redo: () => {},
      });
    },
  },
  {
    name: "Horizontal Rule",
    icon: "—",
    type: "block",
    onSelect: async (rep, props, um) => {
      props.entityID && clearCommandSearchText(props.entityID);
      await createBlockWithType(rep, props, "horizontal-rule");
      um.add({
        undo: () => {
          props.entityID && focusTextBlock(props.entityID);
        },
        redo: () => {},
      });
    },
  },
  {
    name: "Poll",
    icon: <BlockPollSmall />,
    type: "block",
    onSelect: async (rep, props, um) => {
      let entity = await createBlockWithType(rep, props, "poll");
      let pollOptionEntity = v7();
      await rep.mutate.addPollOption({
        pollEntity: entity,
        pollOptionEntity,
        pollOptionName: "",
        factID: v7(),
        permission_set: props.entity_set,
      });
      await rep.mutate.addPollOption({
        pollEntity: entity,
        pollOptionEntity: v7(),
        pollOptionName: "",
        factID: v7(),
        permission_set: props.entity_set,
      });
      usePollBlockUIState.setState((s) => ({ [entity]: { state: "editing" } }));
      setTimeout(() => {
        focusElement(
          document.getElementById(
            elementId.block(entity).pollInput(pollOptionEntity),
          ) as HTMLInputElement | null,
        );
      }, 20);
      um.add({
        undo: () => {
          props.entityID && focusTextBlock(props.entityID);
        },
        redo: () => {
          setTimeout(() => {
            focusElement(
              document.getElementById(
                elementId.block(entity).pollInput(pollOptionEntity),
              ) as HTMLInputElement | null,
            );
          }, 20);
        },
      });
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
    name: "Bluesky Post",
    icon: <BlockBlueskySmall />,
    type: "block",
    onSelect: async (rep, props) => {
      createBlockWithType(rep, props, "bluesky-post");
    },
  },
  {
    name: "Math",
    icon: <BlockMathSmall />,
    type: "block",
    hiddenInPublication: false,
    onSelect: async (rep, props) => {
      createBlockWithType(rep, props, "math");
    },
  },
  {
    name: "Code",
    icon: <BlockCodeSmall />,
    type: "block",
    hiddenInPublication: false,
    onSelect: async (rep, props) => {
      let entity = await createBlockWithType(rep, props, "code");
      let lastLang = localStorage.getItem(LAST_USED_CODE_LANGUAGE_KEY);
      if (lastLang) {
        await rep.mutate.assertFact({
          entity,
          attribute: "block/code-language",
          data: { type: "string", value: lastLang },
        });
      }
    },
  },

  // EVENT STUFF
  {
    name: "Date and Time",
    icon: <BlockCalendarSmall />,
    type: "event",
    hiddenInPublication: true,
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

async function setHeaderCommand(
  level: number,
  rep: Replicache<ReplicacheMutators>,
  props: Props & { entity_set: string },
) {
  let entity = await createBlockWithType(rep, props, "heading");
  await rep.mutate.assertFact({
    entity,
    attribute: "block/heading-level",
    data: { type: "number", value: level },
  });
  clearCommandSearchText(entity);
}
function focusTextBlock(entityID: string) {
  document.getElementById(elementId.block(entityID).text)?.focus();
}
