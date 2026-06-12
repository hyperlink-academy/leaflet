// Custom cursor widget for y-prosemirror's yCursorPlugin. Instead of the
// default always-visible name tag, remote cursors get a small rounded cap
// that blooms open to reveal the user's name on hover (see the
// .yjs-cursor-cap styles in app/globals.css).
export const collabCursorBuilder = (user: {
  name: string;
  color: string;
}): HTMLElement => {
  const cursor = document.createElement("span");
  cursor.classList.add("ProseMirror-yjs-cursor");
  cursor.style.setProperty("--cursor-color", user.color);
  // Word-joiners on either side keep the widget from affecting line breaks,
  // same as y-prosemirror's default cursor builder.
  cursor.appendChild(document.createTextNode("\u2060"));
  const cap = document.createElement("div");
  cap.classList.add("yjs-cursor-cap");
  const name = document.createElement("span");
  name.classList.add("yjs-cursor-name");
  name.textContent = user.name;
  cap.appendChild(name);
  cursor.appendChild(cap);
  cursor.appendChild(document.createTextNode("\u2060"));
  return cursor;
};
