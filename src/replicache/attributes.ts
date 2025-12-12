import type { AppBskyFeedGetPostThread } from "@atproto/api";
import type { DeepAsReadonlyJSONValue } from "./utils";

const RootAttributes = {
  "root/page": {
    type: "ordered-reference",
    cardinality: "many",
  },
} as const;
const PageAttributes = {
  "card/block": {
    type: "ordered-reference",
    cardinality: "many",
  },
  "page/type": {
    type: "page-type-union",
    cardinality: "one",
  },
  "canvas/block": {
    type: "spatial-reference",
    cardinality: "many",
  },
  "canvas/block/width": {
    type: "number",
    cardinality: "one",
  },
  "canvas/block/rotation": {
    type: "number",
    cardinality: "one",
  },
  "canvas/narrow-width": {
    type: "boolean",
    cardinality: "one",
  },
  "canvas/background-pattern": {
    type: "canvas-pattern-union",
    cardinality: "one",
  },
} as const;

const BlockAttributes = {
  "block/type": {
    type: "block-type-union",
    cardinality: "one",
  },
  "block/is-list": {
    type: "boolean",
    cardinality: "one",
  },
  "block/is-locked": {
    type: "boolean",
    cardinality: "one",
  },
  "block/check-list": {
    type: "boolean",
    cardinality: "one",
  },
  "block/text-alignment": {
    type: "text-alignment-type-union",
    cardinality: "one",
  },
  "block/date-time": {
    type: "date-time",
    cardinality: "one",
  },
  "block/text": {
    type: "text",
    cardinality: "one",
  },
  "block/heading-level": {
    type: "number",
    cardinality: "one",
  },
  "block/image": {
    type: "image",
    cardinality: "one",
  },
  "block/card": {
    type: "reference",
    cardinality: "one",
  },
  "block/bluesky-post": {
    type: "bluesky-post",
    cardinality: "one",
  },
  "block/math": {
    type: "string",
    cardinality: "one",
  },
  "block/code": {
    type: "string",
    cardinality: "one",
  },
  "block/code-language": {
    type: "string",
    cardinality: "one",
  },
} as const;

const MailboxAttributes = {
  "mailbox/draft": {
    type: "reference",
    cardinality: "one",
  },
  "mailbox/archive": {
    type: "reference",
    cardinality: "one",
  },
  "mailbox/subscriber-count": {
    type: "number",
    cardinality: "one",
  },
} as const;

const LinkBlockAttributes = {
  "link/preview": {
    type: "image",
    cardinality: "one",
  },
  "link/url": {
    type: "string",
    cardinality: "one",
  },
  "link/description": {
    type: "string",
    cardinality: "one",
  },
  "link/title": {
    type: "string",
    cardinality: "one",
  },
} as const;

const EmbedBlockAttributes = {
  "embed/url": {
    type: "string",
    cardinality: "one",
  },
  "embed/height": {
    type: "number",
    cardinality: "one",
  },
} as const;

const BlueskyPostBlockAttributes = {
  "bluesky-post/url": {
    type: "string",
    cardinality: "one",
  },
} as const;

const ButtonBlockAttributes = {
  "button/text": {
    type: "string",
    cardinality: "one",
  },
  "button/url": {
    type: "string",
    cardinality: "one",
  },
} as const;

const ImageBlockAttributes = {
  "image/full-bleed": {
    type: "boolean",
    cardinality: "one",
  },
  "image/alt": {
    type: "string",
    cardinality: "one",
  },
} as const;

const PollBlockAttributes = {
  "poll/options": {
    type: "ordered-reference",
    cardinality: "many",
  },
  "poll-option/name": {
    type: "string",
    cardinality: "one",
  },
} as const;

export const ThemeAttributes = {
  "theme/font": {
    type: "string",
    cardinality: "one",
  },
  "theme/page-leaflet-watermark": {
    type: "boolean",
    cardinality: "one",
  },
  "theme/page-background": {
    type: "color",
    cardinality: "one",
  },
  "theme/background-image": {
    type: "image",
    cardinality: "one",
  },
  "theme/background-image-repeat": {
    type: "number",
    cardinality: "one",
  },
  "theme/card-background": {
    type: "color",
    cardinality: "one",
  },
  "theme/card-background-image": {
    type: "image",
    cardinality: "one",
  },
  "theme/card-background-image-repeat": {
    type: "number",
    cardinality: "one",
  },
  "theme/card-background-image-opacity": {
    type: "number",
    cardinality: "one",
  },
  "theme/card-border-hidden": {
    type: "boolean",
    cardinality: "one",
  },
  "theme/primary": {
    type: "color",
    cardinality: "one",
  },
  "theme/accent-background": {
    type: "color",
    cardinality: "one",
  },
  "theme/accent-text": {
    type: "color",
    cardinality: "one",
  },
  "theme/highlight-1": {
    type: "color",
    cardinality: "one",
  },
  "theme/highlight-2": {
    type: "color",
    cardinality: "one",
  },
  "theme/highlight-3": {
    type: "color",
    cardinality: "one",
  },
  "theme/code-theme": {
    type: "string",
    cardinality: "one",
  },
} as const;

export const Attributes = {
  ...RootAttributes,
  ...PageAttributes,
  ...BlockAttributes,
  ...LinkBlockAttributes,
  ...ThemeAttributes,
  ...MailboxAttributes,
  ...EmbedBlockAttributes,
  ...BlueskyPostBlockAttributes,
  ...ButtonBlockAttributes,
  ...ImageBlockAttributes,
  ...PollBlockAttributes,
};
export type Attributes = typeof Attributes;
export type Attribute = keyof Attributes;

// Pre-defined data type shapes (avoids repeated computation)
export type TextData = { type: "text"; value: string };
export type StringData = { type: "string"; value: string };
export type SpatialReferenceData = {
  type: "spatial-reference";
  position: { x: number; y: number };
  value: string;
};
export type DateTimeData = {
  type: "date-time";
  value: string;
  originalTimezone: string;
  dateOnly?: boolean;
};
export type OrderedReferenceData = {
  type: "ordered-reference";
  position: string;
  value: string;
};
export type BlueskyPostData = {
  type: "bluesky-post";
  value: DeepAsReadonlyJSONValue<
    AppBskyFeedGetPostThread.OutputSchema["thread"]
  >;
};
export type ImageData = {
  type: "image";
  fallback: string;
  src: string;
  height: number;
  width: number;
  local?: string;
};
export type BooleanData = { type: "boolean"; value: boolean };
export type NumberData = { type: "number"; value: number };
export type AwarenessData = { type: "awareness"; value: string };
export type ReferenceData = { type: "reference"; value: string };
export type TextAlignmentData = {
  type: "text-alignment-type-union";
  value: "right" | "left" | "center" | "justify";
};
export type PageTypeData = { type: "page-type-union"; value: "doc" | "canvas" };
export type BlockTypeData = {
  type: "block-type-union";
  value:
    | "datetime"
    | "rsvp"
    | "text"
    | "image"
    | "card"
    | "heading"
    | "link"
    | "mailbox"
    | "embed"
    | "button"
    | "poll"
    | "bluesky-post"
    | "math"
    | "code"
    | "blockquote"
    | "horizontal-rule";
};
export type CanvasPatternData = {
  type: "canvas-pattern-union";
  value: "dot" | "grid" | "plain";
};
export type ColorData = { type: "color"; value: string };

// Direct mapping from attribute to data type (avoids double indirection)
export interface AttributeDataMap {
  // Root attributes
  "root/page": OrderedReferenceData;
  // Page attributes
  "card/block": OrderedReferenceData;
  "page/type": PageTypeData;
  "canvas/block": SpatialReferenceData;
  "canvas/block/width": NumberData;
  "canvas/block/rotation": NumberData;
  "canvas/narrow-width": BooleanData;
  "canvas/background-pattern": CanvasPatternData;
  // Block attributes
  "block/type": BlockTypeData;
  "block/is-list": BooleanData;
  "block/is-locked": BooleanData;
  "block/check-list": BooleanData;
  "block/text-alignment": TextAlignmentData;
  "block/date-time": DateTimeData;
  "block/text": TextData;
  "block/heading-level": NumberData;
  "block/image": ImageData;
  "block/card": ReferenceData;
  "block/bluesky-post": BlueskyPostData;
  "block/math": StringData;
  "block/code": StringData;
  "block/code-language": StringData;
  // Mailbox attributes
  "mailbox/draft": ReferenceData;
  "mailbox/archive": ReferenceData;
  "mailbox/subscriber-count": NumberData;
  // Link block attributes
  "link/preview": ImageData;
  "link/url": StringData;
  "link/description": StringData;
  "link/title": StringData;
  // Embed block attributes
  "embed/url": StringData;
  "embed/height": NumberData;
  // Bluesky post block attributes
  "bluesky-post/url": StringData;
  // Button block attributes
  "button/text": StringData;
  "button/url": StringData;
  // Image block attributes
  "image/full-bleed": BooleanData;
  "image/alt": StringData;
  // Poll block attributes
  "poll/options": OrderedReferenceData;
  "poll-option/name": StringData;
  // Theme attributes
  "theme/font": StringData;
  "theme/page-leaflet-watermark": BooleanData;
  "theme/page-background": ColorData;
  "theme/background-image": ImageData;
  "theme/background-image-repeat": NumberData;
  "theme/card-background": ColorData;
  "theme/card-background-image": ImageData;
  "theme/card-background-image-repeat": NumberData;
  "theme/card-background-image-opacity": NumberData;
  "theme/card-border-hidden": BooleanData;
  "theme/primary": ColorData;
  "theme/accent-background": ColorData;
  "theme/accent-text": ColorData;
  "theme/highlight-1": ColorData;
  "theme/highlight-2": ColorData;
  "theme/highlight-3": ColorData;
  "theme/code-theme": StringData;
}

// Optimized Data type using direct lookup instead of computed indexed access
export type Data<A extends Attribute> = AttributeDataMap[A];

// Pre-computed filter results for common patterns (avoids conditional mapped types)
export type ReferenceAttribute =
  | "block/card"
  | "mailbox/draft"
  | "mailbox/archive";
export type OrderedReferenceAttribute =
  | "root/page"
  | "card/block"
  | "poll/options";
export type SpatialReferenceAttribute = "canvas/block";
export type AnyReferenceAttribute =
  | ReferenceAttribute
  | OrderedReferenceAttribute
  | SpatialReferenceAttribute;
export type ManyCardinalityAttribute =
  | "root/page"
  | "card/block"
  | "canvas/block"
  | "poll/options";
export type OneCardinalityAttribute = Exclude<Attribute, ManyCardinalityAttribute>;

// Additional pre-computed filter types for common patterns
export type TextAttribute = "block/text";
export type ImageAttribute =
  | "block/image"
  | "link/preview"
  | "theme/background-image"
  | "theme/card-background-image";
export type ColorAttribute =
  | "theme/page-background"
  | "theme/card-background"
  | "theme/primary"
  | "theme/accent-background"
  | "theme/accent-text"
  | "theme/highlight-1"
  | "theme/highlight-2"
  | "theme/highlight-3";
export type ColorOneCardinalityAttribute = ColorAttribute;

// Keep FilterAttributes for backward compatibility but use cached results when possible
export type FilterAttributes<F extends Partial<Attributes[keyof Attributes]>> =
  {
    [A in keyof Attributes as Attributes[A] extends F
      ? A
      : never]: Attributes[A];
  };
