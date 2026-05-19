/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'
import type * as PubLeafletContent from './content'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.publicationPage'

export interface Record {
  $type: 'pub.leaflet.publicationPage'
  publication: string
  path: string
  title?: string
  publishedAt?: string
  content: PubLeafletContent.Main
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
