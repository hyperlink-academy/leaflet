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

const is$typed = _is$typed,
  validate = _validate
const id = 'site.standard.theme.color'

export interface Rgb {
  $type?: 'site.standard.theme.color#rgb'
  r: number
  g: number
  b: number
}

const hashRgb = 'rgb'

export function isRgb<V>(v: V) {
  return is$typed(v, id, hashRgb)
}

export function validateRgb<V>(v: V) {
  return validate<Rgb & V>(v, id, hashRgb)
}

export interface Rgba {
  $type?: 'site.standard.theme.color#rgba'
  r: number
  g: number
  b: number
  a: number
}

const hashRgba = 'rgba'

export function isRgba<V>(v: V) {
  return is$typed(v, id, hashRgba)
}

export function validateRgba<V>(v: V) {
  return validate<Rgba & V>(v, id, hashRgba)
}
