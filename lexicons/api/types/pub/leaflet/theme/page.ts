/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as PubLeafletThemeColor from './color'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.theme.page'

/** Colors a single page overrides. Each absent color is inherited from the document's or publication's theme. */
export interface Main {
  $type?: 'pub.leaflet.theme.page'
  pageBackground?:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
  primary?:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
  accentBackground?:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
  accentText?:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
