import { flushSync } from "react-dom";
import { RefObject } from "react";
import { Replicache } from "replicache";
import { bundledLanguagesInfo } from "shiki";
import type { ReplicacheMutators } from "src/replicache";
import { focusBlock } from "src/utils/focusBlock";
import { LAST_USED_CODE_LANGUAGE_KEY } from "src/utils/codeLanguageStorage";
import { BlockProps } from "../Block";

const resolveCodeLanguage = (input: string) => {
  let lang = input.toLowerCase();
  if (["plaintext", "plain", "text", "txt"].includes(lang)) return "plaintext";
  return (
    bundledLanguagesInfo.find((l) => l.id === lang || l.aliases?.includes(lang))
      ?.id || null
  );
};

// Matches a ``` fence with an optional language identifier (e.g. ```ts)
export const codeFencePattern = /^```([a-zA-Z0-9#+.-]*)$/;

export const convertToCodeBlock = (
  propsRef: RefObject<BlockProps & { entity_set: { set: string } }>,
  repRef: RefObject<Replicache<ReplicacheMutators> | null>,
  langInput?: string,
) => {
  let lang = langInput
    ? resolveCodeLanguage(langInput)
    : localStorage.getItem(LAST_USED_CODE_LANGUAGE_KEY);
  flushSync(() => {
    repRef.current?.mutate.assertFact({
      entity: propsRef.current.entityID,
      attribute: "block/type",
      data: { type: "block-type-union", value: "code" },
    });
    if (lang) {
      repRef.current?.mutate.assertFact({
        entity: propsRef.current.entityID,
        attribute: "block/code-language",
        data: { type: "string", value: lang },
      });
    }
  });
  if (langInput && lang)
    localStorage.setItem(LAST_USED_CODE_LANGUAGE_KEY, lang);
  setTimeout(() => {
    focusBlock({ ...propsRef.current, type: "code" }, { type: "start" });
  }, 20);
};
