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

/** Marks where members-only content begins and declares which publication members can read past it. */
export interface Main {
  $type?: 'pub.leaflet.blocks.membersOnlyDelimiter'
  /** Whether access is available to all subscribers, all paid members, or selected paid tiers. */
  audience: 'subscribers' | 'paid' | 'tiers' | (string & {})
  /** Paid tier ids that grant access when audience is tiers. An empty selection grants no membership access. */
  tierIds?: string[]
  /** When an early-access gate widens to widerReleaseAudience. Absent when the gate never widens. */
  widerReleaseAt?: string
  widerReleaseAudience?:
    | $Typed<Public>
    | $Typed<Subscribers>
    | $Typed<Paid>
    | $Typed<Tiers>
    | { $type: string }
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

/** Anyone, signed in or not. */
export interface Public {
  $type?: 'pub.leaflet.blocks.membersOnlyDelimiter#public'
}

const hashPublic = 'public'

export function isPublic<V>(v: V) {
  return is$typed(v, id, hashPublic)
}

export function validatePublic<V>(v: V) {
  return validate<Public & V>(v, id, hashPublic)
}

/** All free and paid subscribers. */
export interface Subscribers {
  $type?: 'pub.leaflet.blocks.membersOnlyDelimiter#subscribers'
}

const hashSubscribers = 'subscribers'

export function isSubscribers<V>(v: V) {
  return is$typed(v, id, hashSubscribers)
}

export function validateSubscribers<V>(v: V) {
  return validate<Subscribers & V>(v, id, hashSubscribers)
}

/** All paid members. */
export interface Paid {
  $type?: 'pub.leaflet.blocks.membersOnlyDelimiter#paid'
}

const hashPaid = 'paid'

export function isPaid<V>(v: V) {
  return is$typed(v, id, hashPaid)
}

export function validatePaid<V>(v: V) {
  return validate<Paid & V>(v, id, hashPaid)
}

/** Members of the selected paid tiers. */
export interface Tiers {
  $type?: 'pub.leaflet.blocks.membersOnlyDelimiter#tiers'
  /** Paid tier ids that grant access. An empty selection grants no membership access. */
  tierIds: string[]
}

const hashTiers = 'tiers'

export function isTiers<V>(v: V) {
  return is$typed(v, id, hashTiers)
}

export function validateTiers<V>(v: V) {
  return validate<Tiers & V>(v, id, hashTiers)
}
