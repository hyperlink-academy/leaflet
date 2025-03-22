import * as PageLexicons from "./pages";
import { BlockLexicons } from "./blocks";
import { PubLeafletDocument } from "./document";
import * as PublicationLexicons from "./publication";

import * as fs from "fs";
import * as path from "path";
import { PublicKeyPage } from "twilio/lib/rest/accounts/v1/credential/publicKey";
const outdir = path.join("lexicons", "out");

fs.rmSync(outdir, { recursive: true });
fs.mkdirSync(outdir);

const lexicons = [
  PubLeafletDocument,
  PageLexicons.PubLeafletPagesLinearDocument,
  ...BlockLexicons,
  ...Object.values(PublicationLexicons),
];

// Write each lexicon to a file
lexicons.forEach((lexicon) => {
  const filename = path.join(outdir, lexicon.id.replace(/\./g, "_") + ".json");
  fs.writeFileSync(filename, JSON.stringify(lexicon, null, 2));
});
