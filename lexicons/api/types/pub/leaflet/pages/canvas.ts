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
import type * as PubLeafletBlocksHtml from '../blocks/html'
import type * as PubLeafletBlocksText from '../blocks/text'
import type * as PubLeafletBlocksBlockquote from '../blocks/blockquote'
import type * as PubLeafletBlocksHeader from '../blocks/header'
import type * as PubLeafletBlocksImage from '../blocks/image'
import type * as PubLeafletBlocksImageGallery from '../blocks/imageGallery'
import type * as PubLeafletBlocksUnorderedList from '../blocks/unorderedList'
import type * as PubLeafletBlocksOrderedList from '../blocks/orderedList'
import type * as PubLeafletBlocksWebsite from '../blocks/website'
import type * as PubLeafletBlocksMath from '../blocks/math'
import type * as PubLeafletBlocksCode from '../blocks/code'
import type * as PubLeafletBlocksHorizontalRule from '../blocks/horizontalRule'
import type * as PubLeafletBlocksBskyPost from '../blocks/bskyPost'
import type * as PubLeafletBlocksStandardSitePost from '../blocks/standardSitePost'
import type * as PubLeafletBlocksStandardSitePublication from '../blocks/standardSitePublication'
import type * as PubLeafletBlocksPage from '../blocks/page'
import type * as PubLeafletBlocksPoll from '../blocks/poll'
import type * as PubLeafletBlocksButton from '../blocks/button'
import type * as PubLeafletBlocksPostsList from '../blocks/postsList'
import type * as PubLeafletBlocksSignup from '../blocks/signup'
import type * as PubLeafletBlocksRecommendedPubs from '../blocks/recommendedPubs'
import type * as PubLeafletBlocksMembersOnlyDelimiter from '../blocks/membersOnlyDelimiter'
import type * as PubLeafletBlocksPostHeader from '../blocks/postHeader'
import type * as PubLeafletPagesLinearDocument from './linearDocument'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.pages.canvas'

export interface Main {
  $type?: 'pub.leaflet.pages.canvas'
  id?: string
  blocks: Block[]
  /** How a narrow viewport frames the canvas: the whole canvas scaled to fit the width (unconstrained, the default), or a phone-width area anchored to the canvas's left edge or centered on it, shown at up to 1:1. */
  mobileView?: 'unconstrained' | 'left' | 'center' | (string & {})
  /** Viewers cannot zoom the canvas: no wheel, pinch, double-tap or zoom controls. */
  lockViewerZoom?: boolean
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface Block {
  $type?: 'pub.leaflet.pages.canvas#block'
  block:
    | $Typed<PubLeafletBlocksIframe.Main>
    | $Typed<PubLeafletBlocksHtml.Main>
    | $Typed<PubLeafletBlocksText.Main>
    | $Typed<PubLeafletBlocksBlockquote.Main>
    | $Typed<PubLeafletBlocksHeader.Main>
    | $Typed<PubLeafletBlocksImage.Main>
    | $Typed<PubLeafletBlocksImageGallery.Main>
    | $Typed<PubLeafletBlocksUnorderedList.Main>
    | $Typed<PubLeafletBlocksOrderedList.Main>
    | $Typed<PubLeafletBlocksWebsite.Main>
    | $Typed<PubLeafletBlocksMath.Main>
    | $Typed<PubLeafletBlocksCode.Main>
    | $Typed<PubLeafletBlocksHorizontalRule.Main>
    | $Typed<PubLeafletBlocksBskyPost.Main>
    | $Typed<PubLeafletBlocksStandardSitePost.Main>
    | $Typed<PubLeafletBlocksStandardSitePublication.Main>
    | $Typed<PubLeafletBlocksPage.Main>
    | $Typed<PubLeafletBlocksPoll.Main>
    | $Typed<PubLeafletBlocksButton.Main>
    | $Typed<PubLeafletBlocksPostsList.Main>
    | $Typed<PubLeafletBlocksSignup.Main>
    | $Typed<PubLeafletBlocksRecommendedPubs.Main>
    | $Typed<PubLeafletBlocksMembersOnlyDelimiter.Main>
    | $Typed<PubLeafletBlocksPostHeader.Main>
    | $Typed<PubLeafletPagesLinearDocument.Main>
    | { $type: string }
  x: number
  y: number
  width: number
  height?: number
  /** The rotation of the block in degrees */
  rotation?: number
  /** Fractional index ordering this block against its siblings on the z axis. Blocks without one stack below every block with one, ordered by position. */
  stackOrder?: string
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
