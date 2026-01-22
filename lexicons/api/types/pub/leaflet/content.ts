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
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
