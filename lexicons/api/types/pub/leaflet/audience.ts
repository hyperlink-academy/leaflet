/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.audience'

/** Anyone, signed in or not. */
export interface Public {
  $type?: 'pub.leaflet.audience#public'
}

const hashPublic = 'public'

export function isPublic<V>(v: V) {
  return is$typed(v, id, hashPublic)
}

export function validatePublic<V>(v: V) {
  return validate<Public & V>(v, id, hashPublic)
}

/** All free and paid subscribers to the document's publication. */
export interface Subscribers {
  $type?: 'pub.leaflet.audience#subscribers'
}

const hashSubscribers = 'subscribers'

export function isSubscribers<V>(v: V) {
  return is$typed(v, id, hashSubscribers)
}

export function validateSubscribers<V>(v: V) {
  return validate<Subscribers & V>(v, id, hashSubscribers)
}

/** All paid members of the document's publication. */
export interface Paid {
  $type?: 'pub.leaflet.audience#paid'
}

const hashPaid = 'paid'

export function isPaid<V>(v: V) {
  return is$typed(v, id, hashPaid)
}

export function validatePaid<V>(v: V) {
  return validate<Paid & V>(v, id, hashPaid)
}

/** Active members of the selected paid tiers. */
export interface Tiers {
  $type?: 'pub.leaflet.audience#tiers'
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

/** Accounts the document's author follows. */
export interface Follows {
  $type?: 'pub.leaflet.audience#follows'
}

const hashFollows = 'follows'

export function isFollows<V>(v: V) {
  return is$typed(v, id, hashFollows)
}

export function validateFollows<V>(v: V) {
  return validate<Follows & V>(v, id, hashFollows)
}

/** Accounts following the document's author. */
export interface Followers {
  $type?: 'pub.leaflet.audience#followers'
}

const hashFollowers = 'followers'

export function isFollowers<V>(v: V) {
  return is$typed(v, id, hashFollowers)
}

export function validateFollowers<V>(v: V) {
  return validate<Followers & V>(v, id, hashFollowers)
}
