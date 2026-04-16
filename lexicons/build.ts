import * as PageLexicons from "./src/pages";
import { BlockLexicons } from "./src/blocks";
import { PubLeafletDocument } from "./src/document";
import * as PublicationLexicons from "./src/publication";
import * as PollLexicons from "./src/polls";
import * as InteractionsLexicons from "./src/interactions";
import { ThemeLexicons } from "./src/theme";

import * as fs from "fs";
import * as path from "path";
import { PubLeafletRichTextFacet } from "./src/facet";
import { PubLeafletComment } from "./src/comment";
import { PubLeafletAuthFullPermissions } from "./src/authFullPermissions";
import { PubLeafletContent } from "./src/content";
import * as MentionServiceLexicons from "./src/mentionService";

const outdir = path.join("lexicons", "pub", "leaflet");

if (fs.existsSync(outdir)) {
  fs.rmSync(outdir, { recursive: true });
}
fs.mkdirSync(outdir, { recursive: true });

const lexicons = [
  PubLeafletDocument,
  PubLeafletContent,
  PubLeafletComment,
  PubLeafletRichTextFacet,
  PubLeafletAuthFullPermissions,
  PageLexicons.PubLeafletPagesLinearDocument,
  PageLexicons.PubLeafletPagesCanvasDocument,
  ...ThemeLexicons,
  ...BlockLexicons,
  ...Object.values(PublicationLexicons),
  ...Object.values(PollLexicons),
  ...Object.values(InteractionsLexicons),
];

// Write each lexicon to a file
const allLexicons = [
  ...lexicons,
  ...Object.values(MentionServiceLexicons),
];
allLexicons.forEach((lexicon) => {
  let id = lexicon.id.split(".");
  // Determine output base and path segments based on namespace
  let baseDir: string;
  let segments: string[];
  if (id[0] === "parts" && id[1] === "page") {
    baseDir = path.join("lexicons", "parts", "page");
    segments = id.slice(2, -1);
  } else {
    baseDir = outdir;
    segments = id.slice(2, -1);
  }
  let folder = path.join(baseDir, ...segments);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  const filename = path.join(folder, id[id.length - 1] + ".json");
  fs.writeFileSync(filename, JSON.stringify(lexicon, null, 2));
});
