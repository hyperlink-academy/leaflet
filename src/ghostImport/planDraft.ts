import { v7 } from "uuid";
import { generateNKeysBetween } from "fractional-indexing";
import { BlobRef } from "@atproto/lexicon";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import type { FactInput } from "src/replicache/mutations";
import { processBlocksToPages } from "src/utils/factsToPagesRecord";
import type { PubLeafletPagesLinearDocument } from "lexicons/api";
import {
  ghostHtmlToBlocks,
  type ConvertedContent,
  type ImportImage,
  type ImportWarning,
} from "./ghostToBlocks";
import {
  ghostExcerpt,
  resolveGhostUrl,
  type GhostPost,
} from "./parseGhostExport";

export type GhostImportOptions = {
  siteUrl: string;
  // Put a members-only delimiter at the top of posts Ghost restricted to
  // members/paid, so they stay gated on Leaflet.
  gateMembersOnly: boolean;
};

export type DraftPlan = {
  // Ids of the leaflet this plan materialises into; the content's top-level
  // blocks are parented to firstPageId.
  rootEntityId: string;
  firstPageId: string;
  ghostId: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  content: ConvertedContent;
  coverImage: ImportImage | null;
  warnings: ImportWarning[];
};

export function planGhostDraft(
  post: GhostPost,
  opts: GhostImportOptions,
): DraftPlan {
  const rootEntityId = v7();
  const firstPageId = v7();
  const content = ghostHtmlToBlocks(post.html, {
    siteUrl: opts.siteUrl,
    parent: firstPageId,
    // Only the entity ids of extra entities are used; they join the leaflet's
    // set via createLeaflet.
    permission_set: "",
  });
  const warnings = [...content.warnings];

  if (post.visibility !== "public") {
    if (opts.gateMembersOnly) {
      const entityID = v7();
      content.blocks.unshift({
        entityID,
        parent: firstPageId,
        type: "members-only-delimiter",
        facts: [
          {
            entity: entityID,
            attribute: "block/type",
            data: { type: "block-type-union", value: "members-only-delimiter" },
          },
        ],
      });
      warnings.push({
        kind: "gated",
        detail: `Ghost visibility was "${post.visibility}"; the whole post is placed behind a members-only delimiter`,
      });
    } else {
      warnings.push({
        kind: "ungated",
        detail: `Ghost visibility was "${post.visibility}" but the post will be public on Leaflet`,
      });
    }
  }

  const coverUrl = resolveGhostUrl(post.featureImage, opts.siteUrl);
  const coverImage: ImportImage | null = coverUrl
    ? {
        entityID: v7(),
        url: coverUrl,
        alt: post.featureImageAlt,
        width: null,
        height: null,
      }
    : null;

  const publishedAt = post.publishedAt ?? post.createdAt;
  if (!post.publishedAt)
    warnings.push({
      kind: "no_publish_date",
      detail:
        "Ghost has no publish date for this post; its creation date is used",
    });

  return {
    rootEntityId,
    firstPageId,
    ghostId: post.id,
    slug: post.slug,
    title: post.title,
    description: ghostExcerpt(post),
    tags: post.tags,
    publishedAt,
    content,
    coverImage,
    warnings,
  };
}

export type ImageData = {
  src: string;
  width: number;
  height: number;
  fallback: string;
};

export type DraftFacts = {
  entities: string[];
  facts: Array<FactInput & { entity: string }>;
  // Image blocks whose bytes couldn't be fetched, removed from the draft.
  droppedImages: ImportImage[];
};

// Materialise a plan into the entities and facts of one linear-document page,
// given the resolved storage location of each image. Images that failed to
// resolve are dropped along with their block.
export function draftFacts(
  plan: DraftPlan,
  resolveImage: (image: ImportImage) => ImageData | null,
): DraftFacts {
  const resolved = new Map<string, ImageData>();
  const droppedImages: ImportImage[] = [];
  for (const image of plan.content.images) {
    const data = resolveImage(image);
    if (data) resolved.set(image.entityID, data);
    else droppedImages.push(image);
  }
  const droppedEntities = new Set(droppedImages.map((i) => i.entityID));

  const blocks = plan.content.blocks.filter(
    (b) => !droppedEntities.has(b.entityID),
  );
  const entities = new Set<string>([
    ...blocks.map((b) => b.entityID),
    ...plan.content.extraEntities,
  ]);
  const facts: Array<FactInput & { entity: string }> = [];

  const topLevel = blocks.filter((b) => b.parent === plan.firstPageId);
  const positions = generateNKeysBetween(null, null, topLevel.length);
  topLevel.forEach((b, i) => {
    facts.push({
      entity: plan.firstPageId,
      attribute: "card/block",
      data: {
        type: "ordered-reference",
        value: b.entityID,
        position: positions[i],
      },
    });
  });

  for (const b of blocks) {
    for (const f of b.facts) {
      if (
        f.attribute === "card/block" &&
        droppedEntities.has((f.data as { value: string }).value)
      )
        continue;
      facts.push(f as FactInput & { entity: string });
    }
    const image = resolved.get(b.entityID);
    if (image)
      facts.push({
        entity: b.entityID,
        attribute: "block/image",
        data: { type: "image", ...image },
      });
  }

  if (plan.coverImage) {
    const cover = resolveImage(plan.coverImage);
    if (cover) {
      entities.add(plan.coverImage.entityID);
      facts.push({
        entity: plan.coverImage.entityID,
        attribute: "block/image",
        data: { type: "image", ...cover },
      });
      facts.push({
        entity: plan.rootEntityId,
        attribute: "root/cover-image",
        data: { type: "reference", value: plan.coverImage.entityID },
      });
    } else droppedImages.push(plan.coverImage);
  }

  return { entities: [...entities], facts, droppedImages };
}

// Images keep their Ghost URL and the intrinsic size Ghost rendered, so a
// preview needs no uploads.
export const previewImage = (image: ImportImage): ImageData => ({
  src: image.url,
  width: image.width ?? 1,
  height: image.height ?? 1,
  fallback: "",
});

export type PlanPreview = {
  blocks: PubLeafletPagesLinearDocument.Block[];
  coverImageUrl: string | null;
};

// Run the plan through the same facts → record projection publish uses, with
// the preview upload hook that passes image URLs straight through.
export async function renderPlanPreview(plan: DraftPlan): Promise<PlanPreview> {
  const { facts } = draftFacts(plan, previewImage);
  const allFacts: Fact<Attribute>[] = [
    {
      id: v7(),
      entity: plan.rootEntityId,
      attribute: "root/page",
      data: {
        type: "ordered-reference",
        value: plan.firstPageId,
        position: "a0",
      },
    },
    ...facts.map((f) => ({ id: v7(), ...f }) as Fact<Attribute>),
  ];
  const { pages } = await processBlocksToPages({
    facts: allFacts,
    root_entity: plan.rootEntityId,
    hooks: {
      uploadImage: async (src) =>
        ({
          ref: { $link: src },
          mimeType: "image/*",
          size: 0,
        }) as unknown as BlobRef,
      uploadPoll: null,
    },
  });
  const first = pages[0];
  return {
    blocks:
      first?.type === "doc"
        ? (first.blocks as PubLeafletPagesLinearDocument.Block[])
        : [],
    coverImageUrl: plan.coverImage?.url ?? null,
  };
}
