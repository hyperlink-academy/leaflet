/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'
import type * as ComAtprotoRepoStrongRef from '../../com/atproto/repo/strongRef'
import type * as PubLeafletContent from '../../pub/leaflet/content'

const is$typed = _is$typed,
  validate = _validate
const id = 'site.standard.document'

export interface Record {
  $type: 'site.standard.document'
  bskyPostRef?: ComAtprotoRepoStrongRef.Main
  content?: $Typed<PubLeafletContent.Main> | { $type: string }
  coverImage?: BlobRef
  description?: string
  /** combine with the publication url or the document site to construct a full url to the document */
  path?: string
  publishedAt: string
  /** URI to the site or publication this document belongs to (https or at-uri) */
  site: string
  tags?: string[]
  textContent?: string
  title: string
  updatedAt?: string
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
