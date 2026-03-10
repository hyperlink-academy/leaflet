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
import type * as PubLeafletBlocksText from './text'
import type * as PubLeafletBlocksHeader from './header'
import type * as PubLeafletBlocksImage from './image'
import type * as PubLeafletBlocksUnorderedList from './unorderedList'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.blocks.orderedList'

export interface Main {
  $type?: 'pub.leaflet.blocks.orderedList'
  /** The starting number for this ordered list. Defaults to 1 if not specified. */
  startIndex?: number
  children: ListItem[]
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface ListItem {
  $type?: 'pub.leaflet.blocks.orderedList#listItem'
  content:
    | $Typed<PubLeafletBlocksText.Main>
    | $Typed<PubLeafletBlocksHeader.Main>
    | $Typed<PubLeafletBlocksImage.Main>
    | { $type: string }
  /** Nested ordered list items. Mutually exclusive with unorderedListChildren; if both are present, children takes precedence. */
  children?: ListItem[]
  unorderedListChildren?: PubLeafletBlocksUnorderedList.Main
}

const hashListItem = 'listItem'

export function isListItem<V>(v: V) {
  return is$typed(v, id, hashListItem)
}

export function validateListItem<V>(v: V) {
  return validate<ListItem & V>(v, id, hashListItem)
}
