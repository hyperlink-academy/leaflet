"use client";
import { useState } from "react";
import { Node } from "prosemirror-model";
import { multiBlockSchema } from "components/Blocks/TextBlock/schema";
import { TextComposer } from "components/Composer/TextComposer";
import { parseTierDescriptionDoc } from "src/utils/tierDescriptionDoc";

function initialDocFromValue(value: string | null): Node | undefined {
  if (!value) return undefined;
  let parsed = parseTierDescriptionDoc(value);
  if (parsed) {
    try {
      return multiBlockSchema.nodeFromJSON(parsed);
    } catch {}
  }
  return multiBlockSchema.nodeFromJSON({
    type: "doc",
    content: value.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : undefined,
    })),
  });
}

// A rich-text replacement for a description textarea. Emits the doc as a JSON
// string (or null once emptied) on every edit; see src/utils/tierDescriptionDoc.
export function TierDescriptionEditor(props: {
  label: string;
  initialValue: string | null;
  placeholder?: string;
  onChange: (value: string | null) => void;
}) {
  // Read once: the editor is uncontrolled after mount
  let [initialDoc] = useState(() => initialDocFromValue(props.initialValue));
  return (
    <div className="input-with-border flex flex-col gap-px leading-tight py-1! px-[6px]!">
      <div className="text-tertiary text-sm font-bold italic">
        {props.label}
      </div>
      <TextComposer
        bare
        initialDoc={initialDoc}
        placeholder={props.placeholder}
        inputClassName="min-h-14! text-base text-primary leading-normal"
        onChange={(doc) =>
          props.onChange(
            doc.textContent.trim() === "" ? null : JSON.stringify(doc.toJSON()),
          )
        }
      />
    </div>
  );
}
