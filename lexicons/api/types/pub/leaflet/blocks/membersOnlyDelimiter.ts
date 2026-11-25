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
import type * as PubLeafletAudience from '../audience'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.blocks.membersOnlyDelimiter'

/** Marks where members-only content begins and declares which publication members can read past it. */
export interface Main {
  $type?: 'pub.leaflet.blocks.membersOnlyDelimiter'
  audience:
    | $Typed<PubLeafletAudience.Subscribers>
    | $Typed<PubLeafletAudience.Paid>
    | $Typed<PubLeafletAudience.Tiers>
    | { $type: string }
  /** When an early-access gate widens to widerReleaseAudience. Absent when the gate never widens. */
  widerReleaseAt?: string
  widerReleaseAudience?:
    | $Typed<PubLeafletAudience.Public>
    | $Typed<PubLeafletAudience.Subscribers>
    | $Typed<PubLeafletAudience.Paid>
    | $Typed<PubLeafletAudience.Tiers>
    | { $type: string }
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
