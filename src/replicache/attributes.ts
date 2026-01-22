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
  "block/text-size": {
    type: "text-size-union",
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
  "block/list-style": {
    type: "list-style-union",
    cardinality: "one",
  },
  "block/list-number": {
    type: "number",
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
  "theme/page-width": {
    type: "number",
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
export type Data<A extends keyof typeof Attributes> = {
  text: { type: "text"; value: string };
  string: { type: "string"; value: string };
  "spatial-reference": {
    type: "spatial-reference";
    position: { x: number; y: number };
    value: string;
  };
  "date-time": {
    type: "date-time";
    value: string;
    originalTimezone: string;
    dateOnly?: boolean;
  };
  "ordered-reference": {
    type: "ordered-reference";
    position: string;
    value: string;
  };
  "bluesky-post": {
    type: "bluesky-post";
    value: DeepAsReadonlyJSONValue<
      AppBskyFeedGetPostThread.OutputSchema["thread"]
    >;
  };
  image: {
    type: "image";
    fallback: string;
    src: string;
    height: number;
    width: number;
    local?: string;
  };
  boolean: {
    type: "boolean";
    value: boolean;
  };
  number: {
    type: "number";
    value: number;
  };
  awareness: {
    type: "awareness";
    value: string;
  };
  reference: { type: "reference"; value: string };
  "text-alignment-type-union": {
    type: "text-alignment-type-union";
    value: "right" | "left" | "center" | "justify";
  };
  "text-size-union": {
    type: "text-size-union";
    value: "default" | "small" | "large";
  };
  "page-type-union": { type: "page-type-union"; value: "doc" | "canvas" };
  "block-type-union": {
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
  "canvas-pattern-union": {
    type: "canvas-pattern-union";
    value: "dot" | "grid" | "plain";
  };
  "list-style-union": {
    type: "list-style-union";
    value: "ordered" | "unordered";
  };
  color: { type: "color"; value: string };
}[(typeof Attributes)[A]["type"]];
export type FilterAttributes<F extends Partial<Attributes[keyof Attributes]>> =
  {
    [A in keyof Attributes as Attributes[A] extends F
      ? A
      : never]: Attributes[A];
  };
