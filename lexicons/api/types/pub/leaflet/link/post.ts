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
const id = 'pub.leaflet.link.post'

export interface Record {
  $type: 'pub.leaflet.link.post'
  /** Optional title for this link roundup */
  title?: string
  /** Introduction or context for this batch of links */
  description?: string
  /** The batch of links being shared */
  links: LinkItem[]
  /** Tags for the entire batch */
  tags?: string[]
  /** When the batch was shared */
  createdAt: string
  via?: ViaRef
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}

/** A single link within a batch */
export interface LinkItem {
  $type?: 'pub.leaflet.link.post#linkItem'
  /** The URL being shared */
  url: string
  /** Title of the linked content */
  title?: string
  /** User's blurb about this specific link */
  description?: string
  /** Tags for this specific link */
  tags?: string[]
  embed?: EmbedMeta
}

const hashLinkItem = 'linkItem'

export function isLinkItem<V>(v: V) {
  return is$typed(v, id, hashLinkItem)
}

export function validateLinkItem<V>(v: V) {
  return validate<LinkItem & V>(v, id, hashLinkItem)
}

/** Reference to source of aggregated links */
export interface ViaRef {
  $type?: 'pub.leaflet.link.post#viaRef'
  /** Type of source */
  type?: 'bsky-post' | 'bsky-posts' | 'import' | (string & {})
  /** AT URIs of source records if applicable */
  uris?: string[]
}

const hashViaRef = 'viaRef'

export function isViaRef<V>(v: V) {
  return is$typed(v, id, hashViaRef)
}

export function validateViaRef<V>(v: V) {
  return validate<ViaRef & V>(v, id, hashViaRef)
}

/** Cached embed metadata from the linked page */
export interface EmbedMeta {
  $type?: 'pub.leaflet.link.post#embedMeta'
  /** Thumbnail image */
  image?: BlobRef
  /** Name of the source site */
  siteName?: string
}

const hashEmbedMeta = 'embedMeta'

export function isEmbedMeta<V>(v: V) {
  return is$typed(v, id, hashEmbedMeta)
}

export function validateEmbedMeta<V>(v: V) {
  return validate<EmbedMeta & V>(v, id, hashEmbedMeta)
}
