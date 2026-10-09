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
import type * as ComAtprotoRepoStrongRef from '../../../com/atproto/repo/strongRef'
import type * as PubLeafletPagesLinearDocument from '../pages/linearDocument'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.interactions.answer'

export interface Record {
  $type: 'pub.leaflet.interactions.answer'
  question: ComAtprotoRepoStrongRef.Main
  /** The document the question was asked on. */
  document: string
  content: PubLeafletPagesLinearDocument.Main
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
