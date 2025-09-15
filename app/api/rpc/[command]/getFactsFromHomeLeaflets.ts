import { z } from "zod";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { makeRoute } from "../lib";
import type { Env } from "./route";
import { scanIndexLocal } from "src/replicache/utils";
import { getBlocksWithTypeLocal } from "src/hooks/queries/useBlocks";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";
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
        let [title] = getBlocksWithTypeLocal(facts[token], rootEntity).filter(
          (b) => b.type === "text" || b.type === "heading",
        );
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
