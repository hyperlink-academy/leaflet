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
      // Post search results carry a path-aware URL (site.standard documents
      // can publish under a path that differs from their rkey); store it so
      // the facet's href survives into the published record. The search RPC
      // can fall back to an at:// URI or a relative /lish/ path — neither
      // belongs in an href.
      ...(mention.type === "post" &&
        /^https?:\/\//.test(mention.url) && { href: mention.url }),
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
