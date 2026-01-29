/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../lexicons";
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from "../../../util";
import type * as SiteStandardThemeBasic from "./theme/basic";
import type * as PubLeafletPublication from "../../pub/leaflet/publication";

const is$typed = _is$typed,
  validate = _validate;
const id = "site.standard.publication";

export interface Record {
  $type: "site.standard.publication";
  basicTheme?: SiteStandardThemeBasic.Main;
  theme?: $Typed<PubLeafletPublication.Theme> | { $type: string };
  description?: string;
  icon?: BlobRef;
  name: string;
  preferences?: Preferences;
  url: string;
  [k: string]: unknown;
}

const hashRecord = "main";

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord);
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true);
}

export interface Preferences {
  $type?: "site.standard.publication#preferences";
  showInDiscover: boolean;
  showComments: boolean;
  showMentions: boolean;
  showPrevNext: boolean;
  showRecommends: boolean;
}

const hashPreferences = "preferences";

export function isPreferences<V>(v: V) {
  return is$typed(v, id, hashPreferences);
}

export function validatePreferences<V>(v: V) {
  return validate<Preferences & V>(v, id, hashPreferences);
}
