import { z } from "zod";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { scanIndexLocal } from "src/replicache/utils";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";
import { applyUpdate, Doc } from "yjs";

export const getFactsFromHomeLeaflets = makeRoute({
  route: "getFactsFromHomeLeaflets",
  input: z.object({
    tokens: z.array(z.string()),
  }),
  handler: async ({ tokens }, { supabase }: Pick<Env, "supabase">) => {
    let all_facts = await supabase.rpc("get_facts_for_roots", {
      max_depth: 3,
      roots: tokens,
    });

    if (all_facts.data) {
      let titles = {} as { [key: string]: string };

      let facts = all_facts.data.reduce(
        (acc, fact) => {
          if (!acc[fact.root_id]) acc[fact.root_id] = [];
          acc[fact.root_id].push(fact as unknown as Fact<Attribute>);
          return acc;
        },
        {} as { [key: string]: Fact<Attribute>[] },
      );
      for (let token of tokens) {
        let scan = scanIndexLocal(facts[token]);
        let [root] = scan.eav(token, "root/page");
        let rootEntity = root?.data.value || token;

        // Check page type to determine which blocks to look up
        let [pageType] = scan.eav(rootEntity, "page/type");
        let isCanvas = pageType?.data.value === "canvas";

        // Get blocks and sort by position
        let rawBlocks = isCanvas
          ? scan.eav(rootEntity, "canvas/block").sort((a, b) => {
              if (a.data.position.y === b.data.position.y)
                return a.data.position.x - b.data.position.x;
              return a.data.position.y - b.data.position.y;
            })
          : scan.eav(rootEntity, "card/block").sort((a, b) => {
              if (a.data.position === b.data.position)
                return a.id > b.id ? 1 : -1;
              return a.data.position > b.data.position ? 1 : -1;
            });

        // Map to get type and filter for text/heading
        let blocks = rawBlocks
          .map((b) => {
            let type = scan.eav(b.data.value, "block/type")[0];
            if (
              !type ||
              (type.data.value !== "text" && type.data.value !== "heading")
            )
              return null;
            return b.data;
          })
          .filter((b): b is NonNullable<typeof b> => b !== null);

        let title = blocks[0];

        if (!title) titles[token] = "Untitled";
        else {
          let [content] = scan.eav(title.value, "block/text");
          if (!content) titles[token] = "Untitled";
          else {
            let doc = new Doc();
            const update = base64.toByteArray(content.data.value);
            applyUpdate(doc, update);
            let nodes = doc.getXmlElement("prosemirror").toArray();
            let stringValue = YJSFragmentToString(nodes[0]);
            titles[token] = stringValue;
          }
        }
      }
      return {
        result: { facts, titles },
      };
    }

    return { result: {} };
  },
});
