# Text Editor Behaviors

A living reference for how Leaflet's text editor is expected to behave. Add a
new section for each behavior as it is defined. Each entry specifies the
behavior from the user's point of view, independent of how it is implemented.

## Enter on a blank list item

When the cursor is in a **blank** list item (the item contains no text) and the
user presses **Enter**:

1. **If the item is nested** — there are outer list layers above it — it
   **outdents by one level**: the item moves up to its parent's level. No new
   list item is created.
2. **If the item is already at the top level** — there are no more layers to
   outdent — it is **converted into a normal, non-list text block**. The block
   keeps its text type: a heading stays a heading (at the same heading level), a
   blockquote stays a blockquote, and plain text stays plain text. Only the list
   treatment (bullet / number / checkbox) is removed.

This applies to every kind of list item — unordered, ordered, and checkbox
(to-do).

**Not affected:** pressing Enter in a list item that has content behaves
normally — it splits the item / creates a new sibling list item at the same
depth. Only blank items outdent.
