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
const id = 'pub.leaflet.interactions.questionVisibility'

export interface Record {
  $type: 'pub.leaflet.interactions.questionVisibility'
  /** The document whose questions this record moderates. */
  subject: string
  /** pub.leaflet.interactions.question records shown on the document. */
  accepted: string[]
  /** pub.leaflet.interactions.question records never shown on the document. */
  hidden: string[]
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
