import { readFileSync, writeFileSync } from "node:fs";
const cursorFile = process.env.CURSOR_FILE || "/cursor/cursor";
let file = readFileSync(cursorFile).toString();
let cursor = parseInt(file);
if (Number.isNaN(cursor)) {
  console.log(`invalid cursor: ${cursor}`);
} else {
  let newCursor = (cursor + 300 * 60 * 60 * 12).toString();
  writeFileSync(cursorFile, (cursor + 300 * 60 * 60 * 12).toString());
}
