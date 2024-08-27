import { getBlocksAsHTML } from "src/utils/getBlocksAsHTML";
import { htmlToMarkdown } from "src/htmlMarkdownParsers";
import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { Block } from "components/Blocks";

export async function copySelection(rep: Replicache<ReplicacheMutators>, sortedSelection: Block[]) {
  let html = await getBlocksAsHTML(rep, sortedSelection);
  const data = [
    new ClipboardItem({
      ["text/html"]: new Blob([html.join("\n")], { type: "text/html" }),
      "text/plain": new Blob([htmlToMarkdown(html.join("\n"))], {
        type: "text/plain",
      }),
    }),
  ];
  await navigator.clipboard.write(data);
}