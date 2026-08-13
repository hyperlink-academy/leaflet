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
const id = 'pub.leaflet.blocks.membersOnlyDelimiter'

/** Marks where members-only content begins; blocks after this delimiter are only served to readers with an active paid membership. */
export interface Main {
  $type?: 'pub.leaflet.blocks.membersOnlyDelimiter'
  /** Ids of the membership tiers whose members can read past the delimiter. Absent means every paid tier. */
  tiers?: string[]
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
