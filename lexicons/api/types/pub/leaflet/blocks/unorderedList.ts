/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import { $Typed, is$typed as _is$typed, OmitKey } from '../../../../util'
import type * as PubLeafletBlocksText from './text'
import type * as PubLeafletBlocksHeader from './header'
import type * as PubLeafletBlocksImage from './image'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.blocks.unorderedList'

export interface Main {
  $type?: 'pub.leaflet.blocks.unorderedList'
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
  $type?: 'pub.leaflet.blocks.unorderedList#listItem'
  content:
    | $Typed<PubLeafletBlocksText.Main>
    | $Typed<PubLeafletBlocksHeader.Main>
    | $Typed<PubLeafletBlocksImage.Main>
    | { $type: string }
  children?: ListItem[]
}

const hashListItem = 'listItem'

export function isListItem<V>(v: V) {
  return is$typed(v, id, hashListItem)
}

export function validateListItem<V>(v: V) {
  return validate<ListItem & V>(v, id, hashListItem)
}
