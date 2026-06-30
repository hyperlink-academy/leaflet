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
const id = 'pub.leaflet.blocks.imageGallery'

export interface Main {
  $type?: 'pub.leaflet.blocks.imageGallery'
  images: Image[]
  format?: 'grid' | 'carousel' | 'strip' | (string & {})
  /** Gap between images in pixels. */
  gap?: number
  /** Max width per image in grid view (px); drives how many columns fit. */
  maxWidth?: number
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface Image {
  $type?: 'pub.leaflet.blocks.imageGallery#image'
  image: BlobRef
  /** Alt text description of the image, for accessibility. */
  alt?: string
  aspectRatio: AspectRatio
}

const hashImage = 'image'

export function isImage<V>(v: V) {
  return is$typed(v, id, hashImage)
}

export function validateImage<V>(v: V) {
  return validate<Image & V>(v, id, hashImage)
}

export interface AspectRatio {
  $type?: 'pub.leaflet.blocks.imageGallery#aspectRatio'
  width: number
  height: number
}

const hashAspectRatio = 'aspectRatio'

export function isAspectRatio<V>(v: V) {
  return is$typed(v, id, hashAspectRatio)
}

export function validateAspectRatio<V>(v: V) {
  return validate<AspectRatio & V>(v, id, hashAspectRatio)
}
