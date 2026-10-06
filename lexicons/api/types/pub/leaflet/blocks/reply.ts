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
const id = 'pub.leaflet.blocks.reply'

/** Lets readers submit their own documents as replies to this one (pub.leaflet.interactions.reply) and shows the ones the author made visible (pub.leaflet.interactions.replyVisibility). Replies are resolved at render time rather than stored on the block. */
export interface Main {
  $type?: 'pub.leaflet.blocks.reply'
  /** Label for the button readers use to submit a reply. */
  buttonText?: string
  /** Text inviting readers to reply, shown beside the button. */
  promptText?: string
  /** Render each reply in its own publication's theme. Defaults to true. */
  showPublicationTheme?: boolean
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
