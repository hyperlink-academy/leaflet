"use client";
import { EditorView } from "prosemirror-view";

import { schema } from "components/Blocks/TextBlock/schema";
import { Mention } from "components/Mention";

export const addMentionToEditor = (
  mention: Mention,
  range: { from: number; to: number },
  view: EditorView,
) => {
  if (!view) return;
  const { from, to } = range;
  const tr = view.state.tr;

  if (mention.type == "did") {
    // Delete the @ and any query text
    tr.delete(from, to);
    // Insert didMention inline node
    const mentionText = "@" + mention.handle;
    const didMentionNode = schema.nodes.didMention.create({
      did: mention.did,
      text: mentionText,
    });
    tr.insert(from, didMentionNode);
  }
  if (
    mention.type === "publication" ||
    mention.type === "post" ||
    mention.type === "service_result"
  ) {
    tr.delete(from, to);
    const text = mention.type === "post" ? mention.title : mention.name;
    const atMentionNode = schema.nodes.atMention.create({
      atURI: mention.uri,
      text,
      ...(mention.type === "service_result" && {
        href: mention.href,
        icon: mention.icon,
      }),
    });
    tr.insert(from, atMentionNode);
  }

  // Add a space after the mention
  tr.insertText(" ", from + 1);

  view.dispatch(tr);
  view.focus();
};
