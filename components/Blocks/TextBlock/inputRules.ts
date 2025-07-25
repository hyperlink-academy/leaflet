import {
  InputRule,
  inputRules,
  wrappingInputRule,
} from "prosemirror-inputrules";
import { MutableRefObject } from "react";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { BlockProps } from "../Block";
import { focusBlock } from "src/utils/focusBlock";
import { schema } from "./schema";
import { useUIState } from "src/useUIState";
import { flushSync } from "react-dom";
export const inputrules = (
  propsRef: MutableRefObject<BlockProps & { entity_set: { set: string } }>,
  repRef: MutableRefObject<Replicache<ReplicacheMutators> | null>,
) =>
  inputRules({
    //Strikethrough
    rules: [
      new InputRule(/\~\~([^*]+)\~\~$/, (state, match, start, end) => {
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

      //Italic
      new InputRule(/(?:^|[^*])\*([^*]+)\*$/, (state, match, start, end) => {
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
        flushSync(() =>
          repRef.current?.mutate.assertFact({
            entity: propsRef.current.entityID,
            attribute: "block/type",
            data: { type: "block-type-union", value: "code" },
          }),
        );
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
        repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/is-list",
          data: { type: "boolean", value: true },
        });
        return tr;
      }),

      //Header
      new InputRule(/^([#]{1,3})\s$/, (state, match) => {
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
    ],
  });
