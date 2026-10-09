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
import type * as PubLeafletRichtextFacet from '../richtext/facet'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.interactions.question'

export interface Record {
  $type: 'pub.leaflet.interactions.question'
  /** The document the question is asked on. */
  subject: string
  plaintext: string
  facets?: PubLeafletRichtextFacet.Main[]
  createdAt: string
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
