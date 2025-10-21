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
import type * as PubLeafletBlocksIframe from '../blocks/iframe'
import type * as PubLeafletBlocksText from '../blocks/text'
import type * as PubLeafletBlocksBlockquote from '../blocks/blockquote'
import type * as PubLeafletBlocksHeader from '../blocks/header'
import type * as PubLeafletBlocksImage from '../blocks/image'
import type * as PubLeafletBlocksUnorderedList from '../blocks/unorderedList'
import type * as PubLeafletBlocksWebsite from '../blocks/website'
import type * as PubLeafletBlocksMath from '../blocks/math'
import type * as PubLeafletBlocksCode from '../blocks/code'
import type * as PubLeafletBlocksHorizontalRule from '../blocks/horizontalRule'
import type * as PubLeafletBlocksBskyPost from '../blocks/bskyPost'
import type * as PubLeafletBlocksPage from '../blocks/page'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.pages.canvas'

export interface Main {
  $type?: 'pub.leaflet.pages.canvas'
  id?: string
  blocks: Block[]
  display?: Display
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface Display {
  $type?: 'pub.leaflet.pages.canvas#display'
  narrowWidth?: boolean
}

const hashDisplay = 'display'

export function isDisplay<V>(v: V) {
  return is$typed(v, id, hashDisplay)
}

export function validateDisplay<V>(v: V) {
  return validate<Display & V>(v, id, hashDisplay)
}

export interface Block {
  $type?: 'pub.leaflet.pages.canvas#block'
  block:
    | $Typed<PubLeafletBlocksIframe.Main>
    | $Typed<PubLeafletBlocksText.Main>
    | $Typed<PubLeafletBlocksBlockquote.Main>
    | $Typed<PubLeafletBlocksHeader.Main>
    | $Typed<PubLeafletBlocksImage.Main>
    | $Typed<PubLeafletBlocksUnorderedList.Main>
    | $Typed<PubLeafletBlocksWebsite.Main>
    | $Typed<PubLeafletBlocksMath.Main>
    | $Typed<PubLeafletBlocksCode.Main>
    | $Typed<PubLeafletBlocksHorizontalRule.Main>
    | $Typed<PubLeafletBlocksBskyPost.Main>
    | $Typed<PubLeafletBlocksPage.Main>
    | { $type: string }
  x: number
  y: number
  width: number
  height?: number
  rotation?: number
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

export interface Quote {
  $type?: 'pub.leaflet.pages.canvas#quote'
  start: Position
  end: Position
}

const hashQuote = 'quote'

export function isQuote<V>(v: V) {
  return is$typed(v, id, hashQuote)
}

export function validateQuote<V>(v: V) {
  return validate<Quote & V>(v, id, hashQuote)
}

export interface Position {
  $type?: 'pub.leaflet.pages.canvas#position'
  block: number[]
  offset: number
}

const hashPosition = 'position'

export function isPosition<V>(v: V) {
  return is$typed(v, id, hashPosition)
}

export function validatePosition<V>(v: V) {
  return validate<Position & V>(v, id, hashPosition)
}
