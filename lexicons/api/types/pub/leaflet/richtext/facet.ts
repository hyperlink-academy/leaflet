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
const id = 'pub.leaflet.richtext.facet'

/** Annotation of a sub-string within rich text. */
export interface Main {
  $type?: 'pub.leaflet.richtext.facet'
  index: ByteSlice
  features: (
    | $Typed<Link>
    | $Typed<DidMention>
    | $Typed<AtMention>
    | $Typed<Code>
    | $Typed<Highlight>
    | $Typed<Underline>
    | $Typed<Strikethrough>
    | $Typed<Id>
    | $Typed<Bold>
    | $Typed<Italic>
    | { $type: string }
  )[]
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

/** Specifies the sub-string range a facet feature applies to. Start index is inclusive, end index is exclusive. Indices are zero-indexed, counting bytes of the UTF-8 encoded text. NOTE: some languages, like Javascript, use UTF-16 or Unicode codepoints for string slice indexing; in these languages, convert to byte arrays before working with facets. */
export interface ByteSlice {
  $type?: 'pub.leaflet.richtext.facet#byteSlice'
  byteStart: number
  byteEnd: number
}

const hashByteSlice = 'byteSlice'

export function isByteSlice<V>(v: V) {
  return is$typed(v, id, hashByteSlice)
}

export function validateByteSlice<V>(v: V) {
  return validate<ByteSlice & V>(v, id, hashByteSlice)
}

/** Facet feature for a URL. The text URL may have been simplified or truncated, but the facet reference should be a complete URL. */
export interface Link {
  $type?: 'pub.leaflet.richtext.facet#link'
  uri: string
}

const hashLink = 'link'

export function isLink<V>(v: V) {
  return is$typed(v, id, hashLink)
}

export function validateLink<V>(v: V) {
  return validate<Link & V>(v, id, hashLink)
}

/** Facet feature for mentioning a did. */
export interface DidMention {
  $type?: 'pub.leaflet.richtext.facet#didMention'
  did: string
}

const hashDidMention = 'didMention'

export function isDidMention<V>(v: V) {
  return is$typed(v, id, hashDidMention)
}

export function validateDidMention<V>(v: V) {
  return validate<DidMention & V>(v, id, hashDidMention)
}

/** Facet feature for mentioning an AT URI. */
export interface AtMention {
  $type?: 'pub.leaflet.richtext.facet#atMention'
  atURI: string
}

const hashAtMention = 'atMention'

export function isAtMention<V>(v: V) {
  return is$typed(v, id, hashAtMention)
}

export function validateAtMention<V>(v: V) {
  return validate<AtMention & V>(v, id, hashAtMention)
}

/** Facet feature for inline code. */
export interface Code {
  $type?: 'pub.leaflet.richtext.facet#code'
}

const hashCode = 'code'

export function isCode<V>(v: V) {
  return is$typed(v, id, hashCode)
}

export function validateCode<V>(v: V) {
  return validate<Code & V>(v, id, hashCode)
}

/** Facet feature for highlighted text. */
export interface Highlight {
  $type?: 'pub.leaflet.richtext.facet#highlight'
}

const hashHighlight = 'highlight'

export function isHighlight<V>(v: V) {
  return is$typed(v, id, hashHighlight)
}

export function validateHighlight<V>(v: V) {
  return validate<Highlight & V>(v, id, hashHighlight)
}

/** Facet feature for underline markup */
export interface Underline {
  $type?: 'pub.leaflet.richtext.facet#underline'
}

const hashUnderline = 'underline'

export function isUnderline<V>(v: V) {
  return is$typed(v, id, hashUnderline)
}

export function validateUnderline<V>(v: V) {
  return validate<Underline & V>(v, id, hashUnderline)
}

/** Facet feature for strikethrough markup */
export interface Strikethrough {
  $type?: 'pub.leaflet.richtext.facet#strikethrough'
}

const hashStrikethrough = 'strikethrough'

export function isStrikethrough<V>(v: V) {
  return is$typed(v, id, hashStrikethrough)
}

export function validateStrikethrough<V>(v: V) {
  return validate<Strikethrough & V>(v, id, hashStrikethrough)
}

/** Facet feature for an identifier. Used for linking to a segment */
export interface Id {
  $type?: 'pub.leaflet.richtext.facet#id'
  id?: string
}

const hashId = 'id'

export function isId<V>(v: V) {
  return is$typed(v, id, hashId)
}

export function validateId<V>(v: V) {
  return validate<Id & V>(v, id, hashId)
}

/** Facet feature for bold text */
export interface Bold {
  $type?: 'pub.leaflet.richtext.facet#bold'
}

const hashBold = 'bold'

export function isBold<V>(v: V) {
  return is$typed(v, id, hashBold)
}

export function validateBold<V>(v: V) {
  return validate<Bold & V>(v, id, hashBold)
}

/** Facet feature for italic text */
export interface Italic {
  $type?: 'pub.leaflet.richtext.facet#italic'
}

const hashItalic = 'italic'

export function isItalic<V>(v: V) {
  return is$typed(v, id, hashItalic)
}

export function validateItalic<V>(v: V) {
  return validate<Italic & V>(v, id, hashItalic)
}
