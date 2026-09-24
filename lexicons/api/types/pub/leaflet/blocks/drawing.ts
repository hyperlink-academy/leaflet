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
const id = 'pub.leaflet.blocks.drawing'

/** Freehand ink strokes. The view box is the area of drawing space the block shows, scaled to the block's width; strokes may reach past it. */
export interface Main {
  $type?: 'pub.leaflet.blocks.drawing'
  viewBox: ViewBox
  strokes: Stroke[]
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface ViewBox {
  $type?: 'pub.leaflet.blocks.drawing#viewBox'
  x: number
  y: number
  width: number
  height: number
}

const hashViewBox = 'viewBox'

export function isViewBox<V>(v: V) {
  return is$typed(v, id, hashViewBox)
}

export function validateViewBox<V>(v: V) {
  return validate<ViewBox & V>(v, id, hashViewBox)
}

/** One pen stroke, drawn in order, rendered as a variable-width outline of its input points (as perfect-freehand does). */
export interface Stroke {
  $type?: 'pub.leaflet.blocks.drawing#stroke'
  /** Flattened input points as x, y, pressure triples: x and y in drawing space, pressure from 0 to 1000. */
  points: number[]
  /** A CSS hex color, or one of the document theme's colors: primary (text), accent, or tertiary (faded text). */
  color: string
  /** The stroke's base diameter in drawing space. */
  size: number
  /** The input had no real pressure (a mouse or finger); derive it from the stroke's speed instead. */
  simulatePressure?: boolean
}

const hashStroke = 'stroke'

export function isStroke<V>(v: V) {
  return is$typed(v, id, hashStroke)
}

export function validateStroke<V>(v: V) {
  return validate<Stroke & V>(v, id, hashStroke)
}
