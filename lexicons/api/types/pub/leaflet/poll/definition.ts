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
const id = 'pub.leaflet.poll.definition'

export interface Record {
  $type: 'pub.leaflet.poll.definition'
  name: string
  options: Option[]
  endDate?: string
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}

export interface Option {
  $type?: 'pub.leaflet.poll.definition#option'
  text?: string
}

const hashOption = 'option'

export function isOption<V>(v: V) {
  return is$typed(v, id, hashOption)
}

export function validateOption<V>(v: V) {
  return validate<Option & V>(v, id, hashOption)
}
