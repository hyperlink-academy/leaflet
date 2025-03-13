import {
  LexArray,
  // lexPrimitive
  LexBoolean,
  LexInteger,
  LexString,
  LexUnknown,
  // lexIpldType
  LexBytes,
  LexCidLink,
  // lexRefVariant
  LexRef,
  LexRefUnion,
  // other
  LexBlob,
  lexRecord,
  LexRecord,
  LexObject,
  LexiconDoc,
  LexToken,
} from "@atproto/lexicon";

export const refValue = <T extends Pick<LexiconDoc, "defs" | "id">>(
  l: T | null,
  k?: keyof T["defs"] & string,
) => {
  //Could improve this somehow, to ensure you have to pass in K if l is null?
  if (l === null) return `#${k}` || "";
  return k ? `${l.id}#k` : l.id;
};

export const lexicon = <T extends { defs: LexiconDoc["defs"] }>(args: T) => {
  return {
    lexicon: 1,
    ...args,
  };
};

export const record = (
  args: Omit<LexRecord, "type" | "key"> & {
    key: "tid" | "nsid" | `literal:${string}` | "any";
  },
): LexRecord => ({
  type: "record",
  ...args,
});

export const string = (args?: Omit<LexString, "type">) =>
  ({ type: "string" }) as const;
export const token = (l?: { description: string }): LexToken => ({
  type: "token",
  description: l?.description,
});
export const ref = (ref: string): LexRef => ({ type: "ref", ref });

export const array = (args: Omit<LexArray, "type">): LexArray => ({
  type: "array",
  ...args,
});

export const object = <
  Properties extends {
    [k: string]:
      | LexArray
      // lexPrimitive
      | LexBoolean
      | LexInteger
      | LexString
      | LexUnknown
      // lexIpldType
      | LexBytes
      | LexCidLink
      // lexRefVariant
      | LexRef
      | LexRefUnion
      // other
      | LexBlob;
  },
  Required extends (keyof Properties & string)[],
>(
  args: Omit<LexObject, "type" | "properties" | "required"> & {
    properties: Properties;
    required?: Required;
  },
): LexObject => ({
  type: "object",
  ...args,
});

export const union = (args: Omit<LexRefUnion, "type">): LexRefUnion => ({
  type: "union",
  ...args,
});
