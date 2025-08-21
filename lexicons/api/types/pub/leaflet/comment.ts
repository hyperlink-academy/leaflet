/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { $Typed, is$typed as _is$typed, OmitKey } from '../../../util'
import type * as PubLeafletRichtextFacet from './richtext/facet'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.comment'

export interface Record {
  $type: 'pub.leaflet.comment'
  subject: string
  createdAt: string
  reply?: ReplyRef
  plaintext: string
  facets?: PubLeafletRichtextFacet.Main[]
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}

export interface ReplyRef {
  $type?: 'pub.leaflet.comment#replyRef'
  parent: string
}

const hashReplyRef = 'replyRef'

export function isReplyRef<V>(v: V) {
  return is$typed(v, id, hashReplyRef)
}

export function validateReplyRef<V>(v: V) {
  return validate<ReplyRef & V>(v, id, hashReplyRef)
}
