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
import type * as SiteStandardThemeColor from './color'

const is$typed = _is$typed,
  validate = _validate
const id = 'site.standard.theme.basic'

export interface Main {
  $type?: 'site.standard.theme.basic'
  accent: $Typed<SiteStandardThemeColor.Rgb> | { $type: string }
  accentForeground: $Typed<SiteStandardThemeColor.Rgb> | { $type: string }
  background: $Typed<SiteStandardThemeColor.Rgb> | { $type: string }
  foreground: $Typed<SiteStandardThemeColor.Rgb> | { $type: string }
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
