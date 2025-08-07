/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import { $Typed, is$typed as _is$typed, OmitKey } from '../../../../util'
import type * as PubLeafletBlocksText from '../blocks/text'
import type * as PubLeafletBlocksHeader from '../blocks/header'
import type * as PubLeafletBlocksImage from '../blocks/image'
import type * as PubLeafletBlocksUnorderedList from '../blocks/unorderedList'
import type * as PubLeafletBlocksWebsite from '../blocks/website'
import type * as PubLeafletBlocksMath from '../blocks/math'
import type * as PubLeafletBlocksCode from '../blocks/code'
import type * as PubLeafletBlocksHorizontalRule from '../blocks/horizontalRule'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.pages.linearDocument'

export interface Main {
  $type?: 'pub.leaflet.pages.linearDocument'
  blocks?: Block[]
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface Block {
  $type?: 'pub.leaflet.pages.linearDocument#block'
  block:
    | $Typed<PubLeafletBlocksText.Main>
    | $Typed<PubLeafletBlocksHeader.Main>
    | $Typed<PubLeafletBlocksImage.Main>
    | $Typed<PubLeafletBlocksUnorderedList.Main>
    | $Typed<PubLeafletBlocksWebsite.Main>
    | $Typed<PubLeafletBlocksMath.Main>
    | $Typed<PubLeafletBlocksCode.Main>
    | $Typed<PubLeafletBlocksHorizontalRule.Main>
    | { $type: string }
  alignment?:
    | 'lex:pub.leaflet.pages.linearDocument#textAlignLeft'
    | 'lex:pub.leaflet.pages.linearDocument#textAlignCenter'
    | 'lex:pub.leaflet.pages.linearDocument#textAlignRight'
    | (string & {})
}

const hashBlock = 'block'

export function isBlock<V>(v: V) {
  return is$typed(v, id, hashBlock)
}

export function validateBlock<V>(v: V) {
  return validate<Block & V>(v, id, hashBlock)
}

export const TEXTALIGNLEFT = `${id}#textAlignLeft`
export const TEXTALIGNCENTER = `${id}#textAlignCenter`
export const TEXTALIGNRIGHT = `${id}#textAlignRight`
