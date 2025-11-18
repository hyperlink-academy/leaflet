/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'
import type * as ComAtprotoRepoStrongRef from '../../com/atproto/repo/strongRef'
import type * as PubLeafletPagesLinearDocument from './pages/linearDocument'
import type * as PubLeafletPagesCanvas from './pages/canvas'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.document'

export interface Record {
  $type: 'pub.leaflet.document'
  title: string
  postRef?: ComAtprotoRepoStrongRef.Main
  description?: string
  publishedAt?: string
  publication?: string
  author: string
  pages: (
    | $Typed<PubLeafletPagesLinearDocument.Main>
    | $Typed<PubLeafletPagesCanvas.Main>
    | { $type: string }
  )[]
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
