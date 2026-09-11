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
const id = 'pub.leaflet.blocks.postsList'

export interface Main {
  $type?: 'pub.leaflet.blocks.postsList'
  view?: 'small' | 'medium' | 'chapter' | (string & {})
  highlightFirstPost?: boolean
  filterByTags?: string[]
  /** Show at most this many posts. */
  limit?: number
  /** Show reader-facing controls above the list. The readerSearch / readerTagFilter / readerSort flags pick which ones; each defaults to true when this is set. */
  readerControls?: boolean
  readerSearch?: boolean
  readerTagFilter?: boolean
  readerSort?: boolean
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
