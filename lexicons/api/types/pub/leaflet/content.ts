/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'
import type * as PubLeafletPagesLinearDocument from './pages/linearDocument'
import type * as PubLeafletPagesCanvas from './pages/canvas'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.content'

/** Content format for leaflet documents */
export interface Main {
  $type?: 'pub.leaflet.content'
  pages: (
    | $Typed<PubLeafletPagesLinearDocument.Main>
    | $Typed<PubLeafletPagesCanvas.Main>
    | { $type: string }
  )[]
  /** JSON-encoded array of pages. When the inline pages array would be too large to store on the PDS, the pages are uploaded as a blob and referenced here. When set, consumers MUST ignore `pages` and use the decoded blob contents as the page array; the inline `pages` field will be empty or a stub. */
  blobPages?: BlobRef
  /** Blobs referenced inside `blobPages`. Load-bearing when `blobPages` is set: the PDS only scans the top level of a record for blob references when deciding what to garbage-collect, so any image/etc. blob now living inside the opaque JSON blob must be mirrored here to remain referenced. */
  blobs?: BlobRef[]
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
