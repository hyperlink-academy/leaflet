import * as PageLexicons from "./src/pages";
import { BlockLexicons } from "./src/blocks";
import { PubLeafletDocument } from "./src/document";
import * as PublicationLexicons from "./src/publication";

import * as fs from "fs";
import * as path from "path";
import { PubLeafletRichTextFacet } from "./src/facet";

const outdir = path.join("lexicons", "pub", "leaflet");

if (fs.existsSync(outdir)) {
  fs.rmSync(outdir, { recursive: true });
}
fs.mkdirSync(outdir, { recursive: true });

const lexicons = [
  PubLeafletDocument,
  PubLeafletRichTextFacet,
  PageLexicons.PubLeafletPagesLinearDocument,
  ...BlockLexicons,
  ...Object.values(PublicationLexicons),
];

// Write each lexicon to a file
lexicons.forEach((lexicon) => {
  let id = lexicon.id.split(".");
  let folder = path.join(outdir, ...id.slice(2, -1));
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  const filename = path.join(folder, id[id.length - 1] + ".json");
  fs.writeFileSync(filename, JSON.stringify(lexicon, null, 2));
});
