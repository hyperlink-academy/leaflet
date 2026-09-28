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
const id = 'pub.leaflet.blocks.postHeader'

/** The post's header (publication, title, description, byline) placed as a block, so canvas posts can position it. Renders the document's own metadata; carries no content of its own. */
export interface Main {
  $type?: 'pub.leaflet.blocks.postHeader'
  /** Show a condensed header: title and byline only, without the description. */
  compact?: boolean
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
