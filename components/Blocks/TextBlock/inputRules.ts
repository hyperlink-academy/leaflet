import {
  InputRule,
  inputRules,
  wrappingInputRule,
} from "prosemirror-inputrules";
import { MutableRefObject } from "react";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { BlockProps, focusBlock } from "components/Blocks";
export const inputrules = (
  propsRef: MutableRefObject<BlockProps & { entity_set: { set: string } }>,
  repRef: MutableRefObject<Replicache<ReplicacheMutators> | null>,
) =>
  inputRules({
    rules: [
      new InputRule(/^([#]{1,3})\s$/, (state, match) => {
        let tr = state.tr;
        tr.delete(0, match[0].length);
        let headingLevel = match[1].length;
        repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/type",
          data: { type: "string", value: "heading" },
        });
        repRef.current?.mutate.assertFact({
          entity: propsRef.current.entityID,
          attribute: "block/heading-level",
          data: { type: "number", value: headingLevel },
        });

        setTimeout(
          () =>
            focusBlock(
              {
                value: propsRef.current.entityID,
                type: "heading",
                parent: propsRef.current.parent,
                position: propsRef.current.position,
              },
              { type: "start" },
            ),
          10,
        );
        return tr;
      }),
    ],
  });
