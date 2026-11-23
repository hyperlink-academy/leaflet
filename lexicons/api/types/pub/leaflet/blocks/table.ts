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
import type * as PubLeafletRichtextFacet from '../richtext/facet'

const is$typed = _is$typed,
  validate = _validate
const id = 'pub.leaflet.blocks.table'

export interface Main {
  $type?: 'pub.leaflet.blocks.table'
  rows: Row[]
  headerRow?: boolean
  style?: 'default' | 'striped' | (string & {})
  borders?: boolean
  columnAlignments?: ('left' | 'center' | 'right' | (string & {}))[]
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface Row {
  $type?: 'pub.leaflet.blocks.table#row'
  cells: Cell[]
}

const hashRow = 'row'

export function isRow<V>(v: V) {
  return is$typed(v, id, hashRow)
}

export function validateRow<V>(v: V) {
  return validate<Row & V>(v, id, hashRow)
}

export interface Cell {
  $type?: 'pub.leaflet.blocks.table#cell'
  plaintext: string
  facets?: PubLeafletRichtextFacet.Main[]
}

const hashCell = 'cell'

export function isCell<V>(v: V) {
  return is$typed(v, id, hashCell)
}

export function validateCell<V>(v: V) {
  return validate<Cell & V>(v, id, hashCell)
}
