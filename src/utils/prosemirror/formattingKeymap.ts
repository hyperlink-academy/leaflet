import { toggleMark } from "prosemirror-commands";
import { MarkType } from "prosemirror-model";
import { Command } from "prosemirror-state";

// The standard bold/italic/underline/strikethrough shortcuts, shared by every
// rich-text editor (block editor, comment composers). Binds both Meta- and
// Ctrl- so the Ctrl- variants keep working on mac.
export function formattingKeymap(marks: {
  strong: MarkType;
  em: MarkType;
  underline: MarkType;
  strikethrough: MarkType;
}): Record<string, Command> {
  return {
    "Meta-b": toggleMark(marks.strong),
    "Ctrl-b": toggleMark(marks.strong),
    "Meta-i": toggleMark(marks.em),
    "Ctrl-i": toggleMark(marks.em),
    "Meta-u": toggleMark(marks.underline),
    "Ctrl-u": toggleMark(marks.underline),
    "Ctrl-Meta-x": toggleMark(marks.strikethrough),
  };
}
