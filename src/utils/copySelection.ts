import { getBlocksAsHTML } from "src/utils/getBlocksAsHTML";
import { htmlToMarkdown } from "src/htmlMarkdownParsers";
import { Replicache } from "replicache";
import type { ReplicacheMutators } from "src/replicache";
import { Block } from "components/Blocks/Block";
import { flushPendingTextWrites } from "components/Blocks/TextBlock/useCollabText";

function tableTSV(html: string) {
  const table = new DOMParser()
    .parseFromString(html, "text/html")
    .querySelector("table");
  if (!table) return "";
  for (const br of table.querySelectorAll("br")) br.replaceWith("\n");
  return Array.from(table.rows, (row) =>
    Array.from(row.cells, (cell) => {
      const value = cell.textContent ?? "";
      return /["\t\r\n]/.test(value)
        ? `"${value.replaceAll('"', '""')}"`
        : value;
    }).join("\t"),
  ).join("\n");
}

export async function copySelection(
  rep: Replicache<ReplicacheMutators>,
  sortedSelection: Block[],
) {
  // Start the clipboard write during the user gesture. Safari can reject it
  // after a Replicache read even if the handler started from a click.
  const html = flushPendingTextWrites()
    .then(() => getBlocksAsHTML(rep, sortedSelection))
    .then((parts) => parts.join("\n"));
  const formats: Record<string, Promise<Blob>> = {
    "text/html": html.then((value) => new Blob([value], { type: "text/html" })),
    "text/plain": html.then(
      (value) => new Blob([htmlToMarkdown(value)], { type: "text/plain" }),
    ),
  };
  const tsv = "text/tab-separated-values";
  if (sortedSelection.length === 1 && sortedSelection[0].type === "table") {
    const type = [tsv, `web ${tsv}`].find((type) =>
      ClipboardItem.supports?.(type),
    );
    if (type)
      formats[type] = html.then(
        (value) => new Blob([tableTSV(value)], { type: tsv }),
      );
  }
  await navigator.clipboard.write([new ClipboardItem(formats)]);
}
