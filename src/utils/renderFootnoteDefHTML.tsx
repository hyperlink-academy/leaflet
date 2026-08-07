import { renderToStaticMarkup } from "react-dom/server";
import { RenderYJSFragment } from "components/Blocks/TextBlock/RenderYJSFragment";

// A footnote's content (its block/text yjs value) rendered to the HTML that
// travels in a ref's data-footnote-def attribute — the same shape external
// markdown footnotes are normalized to, from which the paste builder mints a
// fresh footnote entity (see htmlToBlocks). A ref must never travel as a bare
// entity id: the pasted footnote node would alias the source block's entity,
// and deleting the pasted ref would delete the original's content.
export function renderFootnoteDefHTML(value: string): string {
  const html = renderToStaticMarkup(
    <RenderYJSFragment value={value} wrapper="p" renderComments={false} />,
  );
  // A footnote referenced from inside another footnote's definition can't be
  // represented (matching normalizePastedHTML), and leaving its id-carrying
  // markup in the definition would reintroduce the aliasing this exists to
  // prevent.
  if (!html.includes("footnote-ref")) return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  for (const ref of Array.from(
    container.querySelectorAll("span.footnote-ref"),
  ))
    ref.remove();
  return container.innerHTML;
}
