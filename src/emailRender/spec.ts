import type { $Typed } from "@atproto/api";
import {
  PubLeafletBlocksEmbeddedCanvas,
  PubLeafletBlocksPage,
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import type * as SiteStandardThemeBasic from "lexicons/api/types/site/standard/theme/basic";
import { canvasContentHeight } from "src/utils/canvasBlockOrder";
import { pageBlocksInOrder } from "src/utils/pageBlocksInOrder";
import { CONTENT_WIDTH } from "src/canvasZoom/math";
import { normalizePageLinkDisplay } from "src/utils/pageLinkDisplay";

export type EmailRenderPage =
  | $Typed<PubLeafletPagesLinearDocument.Main>
  | $Typed<PubLeafletPagesCanvas.Main>;

// A canvas to draw. Ink drawings are always blocks on a canvas, so they are
// drawn as part of one.
export type EmailRenderTarget = {
  blocks: PubLeafletPagesCanvas.Block[];
  // Pages the canvas's own page-link and embedded-canvas blocks show.
  pages: EmailRenderPage[];
  size: { width: number; height: number };
  // Crop trailing empty space: a canvas page's height is its lowest block's
  // top plus a fixed pad, not where its content ends.
  trimBottom?: boolean;
};

export type EmailRenderSpec = EmailRenderTarget & {
  // Resolves blob refs in the blocks.
  did: string;
  // The publication's creator, who owns the theme's background image blob.
  themeDid: string;
  theme: {
    theme?: PubLeafletPublication.Theme | null;
    basicTheme?: SiteStandardThemeBasic.Main | null;
  };
};

export type EmailRenderImage = { src: string };

// Wide enough for a 2x render at any publication page width an email uses.
const OUTPUT_WIDTH = 1200;
// Bounds a very tall canvas; the email links out to the full post.
const MAX_ASPECT = 4;
// The top slice of a canvas a page-link card shows, as a fraction of its width.
const PREVIEW_ASPECT = 0.36;

// The region drawn, at its natural size, and the output image it is scaled to.
export function emailRenderSize(target: EmailRenderTarget) {
  let { width, height } = target.size;
  let region = { width, height: Math.min(height, width * MAX_ASPECT) };
  let scale = OUTPUT_WIDTH / width;
  return {
    region,
    scale,
    width: OUTPUT_WIDTH,
    height: Math.max(1, Math.round(region.height * scale)),
  };
}

function linkedPages(
  page: PubLeafletPagesCanvas.Main,
  pages: EmailRenderPage[],
): EmailRenderPage[] {
  let ids = new Set(
    pageBlocksInOrder(page).flatMap(({ block }) =>
      PubLeafletBlocksPage.isMain(block.block) ||
      PubLeafletBlocksEmbeddedCanvas.isMain(block.block)
        ? [block.block.id]
        : [],
    ),
  );
  return pages.filter((p) => p.id && ids.has(p.id));
}

// Everything in a post email drawn from an image, by the id PostEmail looks
// it up under: `root` (a canvas post's body), `preview:<pageId>` (a canvas
// page-link card) and `embed:<pageId>` (an embedded canvas, which is what
// the editor's Drawing block is).
export function collectEmailRenderTargets(args: {
  rootCanvas?: PubLeafletPagesCanvas.Main;
  blocks: PubLeafletPagesLinearDocument.Block[];
  pages: EmailRenderPage[];
}): Record<string, EmailRenderTarget> {
  let targets: Record<string, EmailRenderTarget> = {};
  let canvasTarget = (
    page: PubLeafletPagesCanvas.Main,
    size: { width: number; height: number },
    trimBottom?: boolean,
  ): EmailRenderTarget => ({
    blocks: page.blocks ?? [],
    pages: linkedPages(page, args.pages),
    size,
    trimBottom,
  });

  // Sized, so drawn without the published page's grid: the bottom trim needs
  // a flat background to find where the content ends.
  if (args.rootCanvas)
    targets.root = canvasTarget(
      args.rootCanvas,
      {
        width: CONTENT_WIDTH,
        height: canvasContentHeight(args.rootCanvas.blocks ?? []),
      },
      true,
    );

  args.blocks.forEach(({ block }) => {
    const isPageLink = PubLeafletBlocksPage.isMain(block);
    if (!isPageLink && !PubLeafletBlocksEmbeddedCanvas.isMain(block)) return;
    let page = args.pages.find((p) => p.id === block.id);
    if (!PubLeafletPagesCanvas.isMain(page)) return;
    if (isPageLink) {
      if (normalizePageLinkDisplay(block.display) !== "compact")
        targets[`preview:${block.id}`] = canvasTarget(page, {
          width: CONTENT_WIDTH,
          height: Math.round(CONTENT_WIDTH * PREVIEW_ASPECT),
        });
    } else if (page.width && page.height)
      targets[`embed:${block.id}`] = canvasTarget(page, {
        width: page.width,
        height: page.height,
      });
  });
  return targets;
}
