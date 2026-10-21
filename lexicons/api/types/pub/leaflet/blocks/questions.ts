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
const id = 'pub.leaflet.blocks.questions'

/** Lets readers ask the author public questions (pub.leaflet.interactions.question) and shows the ones the author has answered (pub.leaflet.interactions.answer) or accepted (pub.leaflet.interactions.questionVisibility). Questions are resolved at render time rather than stored on the block. */
export interface Main {
  $type?: 'pub.leaflet.blocks.questions'
  /** Label for the button readers use to submit a question. */
  buttonText?: string
  /** Who may ask: anyone, only accounts the author follows, or only accounts following the author. Defaults to anyone. Checked when a question is asked. */
  audience?: 'anyone' | 'follows' | 'followers' | (string & {})
  /** Show readers questions the author hasn't accepted, answered or hidden yet. Defaults to false. */
  showPending?: boolean
  /** Tells this block apart from the document's other blocks of its type; interaction records name it in their `block` field. Records without a matching key belong to the first block of the type. */
  key?: string
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}
