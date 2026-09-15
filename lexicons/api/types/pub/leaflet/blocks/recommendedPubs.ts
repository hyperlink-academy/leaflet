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
const id = 'pub.leaflet.blocks.recommendedPubs'

/** The publications this publication recommends, resolved at render time from its recommendations rather than stored on the block. */
export interface Main {
  $type?: 'pub.leaflet.blocks.recommendedPubs'
  /** Lay the recommendations out as a single side-scrolling row instead of a grid. */
  compact?: boolean
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
