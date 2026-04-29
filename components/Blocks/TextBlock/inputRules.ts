import {
  InputRule,
  inputRules,
  wrappingInputRule,
} from "prosemirror-inputrules";
import { EditorState } from "prosemirror-state";
import { MutableRefObject } from "react";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { BlockProps } from "../Block";
import { focusBlock } from "src/utils/focusBlock";
import { schema } from "./schema";
import { useUIState } from "src/useUIState";
import { flushSync } from "react-dom";
import { LAST_USED_CODE_LANGUAGE_KEY } from "src/utils/codeLanguageStorage";
import { insertFootnote } from "./insertFootnote";
import { useEditorStates } from "src/state/useEditorState";

const anchorInCodeMark = (state: EditorState, start: number, end: number) => {
  const codeMark = state.schema.marks.code;
  if (!codeMark) return false;
  const startMarks = state.doc.resolve(start).marks();
  const endMarks = state.doc.resolve(end).marks();
  return !!codeMark.isInSet(startMarks) || !!codeMark.isInSet(endMarks);
};
export const inputrules = (
  propsRef: MutableRefObject<BlockProps & { entity_set: { set: string } }>,
  repRef: MutableRefObject<Replicache<ReplicacheMutators> | null>,
  openMentionAutocomplete?: () => void,
) =>
  inputRules({
    //Strikethrough
    rules: [
      new InputRule(/\~\~([^*]+)\~\~$/, (state, match, start, end) => {
        if (anchorInCodeMark(state, start, end)) return null;
        const [fullMatch, content] = match;
        const { tr } = state;
        if (content) {
          tr.replaceWith(start, end, state.schema.text(content))
            .addMark(
              start,
              start + content.length,
              schema.marks.strikethrough.create(),
            )
            .removeStoredMark(schema.marks.strikethrough);
          return tr;
        }
        return null;
      }),

      //Highlight
      new InputRule(/\=\=([^*]+)\=\=$/, (state, match, start, end) => {
        if (anchorInCodeMark(state, start, end)) return null;
        const [fullMatch, content] = match;
        const { tr } = state;
        if (content) {
          tr.replaceWith(start, end, state.schema.text(content))
            .addMark(
              start,
              start + content.length,
              schema.marks.highlight.create({
                color: useUIState.getState().lastUsedHighlight || "1",
              }),
            )
            .removeStoredMark(schema.marks.highlight);
          return tr;
        }
        return null;
      }),

      //Bold
      new InputRule(/\*\*([^*]+)\*\*$/, (state, match, start, end) => {
        if (anchorInCodeMark(state, start, end)) return null;
        const [fullMatch, content] = match;
        const { tr } = state;
        if (content) {
          tr.replaceWith(start, end, state.schema.text(content))
            .addMark(
              start,
              start + content.length,
              schema.marks.strong.create(),
            )
            .removeStoredMark(schema.marks.strong);
          return tr;
        }
        return null;
      }),

      //Code
      new InputRule(/\`([^`]+)\`$/, (state, match, start, end) => {
        if (anchorInCodeMark(state, start, end)) return null;
        const [fullMatch, content] = match;
        const { tr } = state;
        if (content) {
          const startIndex = start + fullMatch.indexOf("`");
          tr.replaceWith(startIndex, end, state.schema.text(content))
            .addMark(
              startIndex,
              startIndex + content.length,
              schema.marks.code.create(),
            )
            .removeStoredMark(schema.marks.code);
          return tr;
        }
        return null;
      }),

      //Italic
      new InputRule(/(?:^|[^*])\*([^*]+)\*$/, (state, match, start, end) => {
        if (anchorInCodeMark(state, start, end)) return null;
        const [fullMatch, content] = match;
        const { tr } = state;
        if (content) {
          const startIndex = start + fullMatch.indexOf("*");
          tr.replaceWith(startIndex, end, state.schema.text(content))
            .addMark(
              startIndex,
              startIndex + content.length,
              schema.marks.em.create(),
            )
            .removeStoredMark(schema.marks.em);
          return tr;
        }
        return null;
      }),

      // Code Block
      new InputRule(/^```\s$/, (state, match) => {
        flushSync(() => {
          repRef.current?.mutate.assertFact({
            entity: propsRef.current.entityID,
            attribute: "block/type",
            data: { type: "block-type-union", value: "code" },
          });
          let lastLang = localStorage.getItem(LAST_USED_CODE_LANGUAGE_KEY);
          if (lastLang) {
            repRef.current?.mutate.assertFact({
              entity: propsRef.current.entityID,
              attribute: "block/code-language",
              data: { type: "string", value: lastLang },
            });
          }
        });
        setTimeout(() => {
          focusBlock({ ...propsRef.current, type: "code" }, { type: "start" });
        }, 20);
        return null;
      }),

      //Checklist
      new InputRule(/^\-?\[(\ |x)?\]\s$/, (state, match) => {
        if (!propsRef.current.listData)
          repRef.current?.mutate.assertFact({
            entity: propsRef.current.entityID,
            attribute: "block/is-list",
            data: { type: "boolean", value: true },
          });
        let tr = state.tr;
        tr.delete(0, match[0].length);
        repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/check-list",
          data: { type: "boolean", value: match[1] === "x" ? true : false },
        });
        return tr;
      }),

      // Unordered List
      new InputRule(/^([-+*])\s$/, (state) => {
        if (propsRef.current.listData) return null;
        let tr = state.tr;
        tr.delete(0, 2);
        repRef.current?.mutate.assertFact([
          {
            entity: propsRef.current.entityID,
            attribute: "block/is-list",
            data: { type: "boolean", value: true },
          },
          {
            entity: propsRef.current.entityID,
            attribute: "block/list-style",
            data: { type: "list-style-union", value: "unordered" },
          },
        ]);
        return tr;
      }),

      // Ordered List - respect the starting number typed (supports "1." or "1)")
      new InputRule(/^(\d+)[.)]\s$/, (state, match) => {
        if (propsRef.current.listData) return null;
        let tr = state.tr;
        tr.delete(0, match[0].length);
        const startNumber = parseInt(match[1], 10);
        repRef.current?.mutate.assertFact([
          {
            entity: propsRef.current.entityID,
            attribute: "block/is-list",
            data: { type: "boolean", value: true },
          },
          {
            entity: propsRef.current.entityID,
            attribute: "block/list-style",
            data: { type: "list-style-union", value: "ordered" },
          },
        ]);
        if (startNumber > 1) {
          repRef.current?.mutate.assertFact({
            entity: propsRef.current.entityID,
            attribute: "block/list-number",
            data: { type: "number", value: startNumber },
          });
        }
        return tr;
      }),

      //Blockquote
      new InputRule(/^([>]{1})\s$/, (state, match) => {
        let tr = state.tr;
        tr.delete(0, 2);
        repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "blockquote" },
        });
        return tr;
      }),

      //Header
      new InputRule(/^([#]{1,4})\s$/, (state, match) => {
        let tr = state.tr;
        tr.delete(0, match[0].length);
        let headingLevel = match[1].length;
        repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: "heading" },
        });
        repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/heading-level",
          data: { type: "number", value: headingLevel },
        });
        return tr;
      }),

      // Footnote - [^ triggers footnote insertion
      new InputRule(/\[\^$/, (state, match, start, end) => {
        if (anchorInCodeMark(state, start, end)) return null;
        let tr = state.tr.delete(start, end);
        setTimeout(() => {
          let view = useEditorStates.getState().editorStates[propsRef.current.entityID]?.view;
          if (!view || !repRef.current) return;
          insertFootnote(
            view,
            propsRef.current.entityID,
            repRef.current,
            propsRef.current.entity_set.set,
          );
        }, 0);
        return tr;
      }),

      // Mention - @ at start of line, after space, or after hard break
      new InputRule(/(?:^|\s)@$/, (state, match, start, end) => {
        if (!openMentionAutocomplete) return null;
        if (anchorInCodeMark(state, start, end)) return null;
        // Schedule opening the autocomplete after the transaction is applied
        setTimeout(() => openMentionAutocomplete(), 0);
        return null; // Let the @ be inserted normally
      }),
      // Mention - @ immediately after a hard break (hard breaks are nodes, not text)
      new InputRule(/@$/, (state, match, start, end) => {
        if (!openMentionAutocomplete) return null;
        if (anchorInCodeMark(state, start, end)) return null;
        // Check if the character before @ is a hard break node
        const $pos = state.doc.resolve(start);
        const nodeBefore = $pos.nodeBefore;
        if (nodeBefore && nodeBefore.type.name === "hard_break") {
          setTimeout(() => openMentionAutocomplete(), 0);
        }
        return null; // Let the @ be inserted normally
      }),
    ],
  });
