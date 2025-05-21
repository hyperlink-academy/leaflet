/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import { $Typed, is$typed as _is$typed, OmitKey } from '../../../../util'
import type * as PubLeafletRichtextFacet from '../richtext/facet'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.blocks.header'

export interface Main {
  $type?: 'pub.leaflet.blocks.header'
  level?: number
  plaintext: string
  facets?: PubLeafletRichtextFacet.Main[]
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
