/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'
import type * as PubLeafletThemeColor from './theme/color'
import type * as PubLeafletThemeBackgroundImage from './theme/backgroundImage'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.publication'

export interface Record {
  $type: 'pub.leaflet.publication'
  name: string
  base_path?: string
  description?: string
  icon?: BlobRef
  theme?: Theme
  preferences?: Preferences
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}

export interface Preferences {
  $type?: 'pub.leaflet.publication#preferences'
  showInDiscover: boolean
  showComments: boolean
  showMentions: boolean
  showPrevNext: boolean
}

const hashPreferences = 'preferences'

export function isPreferences<V>(v: V) {
  return is$typed(v, id, hashPreferences)
}

export function validatePreferences<V>(v: V) {
  return validate<Preferences & V>(v, id, hashPreferences)
}

export interface Theme {
  $type?: 'pub.leaflet.publication#theme'
  backgroundColor?:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
  backgroundImage?: PubLeafletThemeBackgroundImage.Main
  pageWidth?: number
  primary?:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
  pageBackground?:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
  showPageBackground: boolean
  accentBackground?:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
  accentText?:
    | $Typed<PubLeafletThemeColor.Rgba>
    | $Typed<PubLeafletThemeColor.Rgb>
    | { $type: string }
}

const hashTheme = 'theme'

export function isTheme<V>(v: V) {
  return is$typed(v, id, hashTheme)
}

export function validateTheme<V>(v: V) {
  return validate<Theme & V>(v, id, hashTheme)
}
