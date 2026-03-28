/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc'
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
const id = 'parts.page.mention.search'

export type QueryParams = {
  /** AT URI of the parts.page.mention.service record identifying which service to query */
  service: string
  /** Search query string */
  search: string
  /** Maximum number of results to return */
  limit?: number
}
export type InputSchema = undefined

export interface OutputSchema {
  results: Result[]
}

export interface CallOptions {
  signal?: AbortSignal
  headers?: HeadersMap
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export function toKnownErr(e: any) {
  return e
}

export interface Result {
  $type?: 'parts.page.mention.search#result'
  /** Identifier for the mentioned entity */
  uri: string
  /** Display name for the mentioned entity */
  name: string
  /** Optional web URL for the mentioned entity */
  href?: string
  /** Optional icon URL for the mentioned entity, displayed next to the mention */
  icon?: string
  embed?: EmbedInfo
}

const hashResult = 'result'

export function isResult<V>(v: V) {
  return is$typed(v, id, hashResult)
}

export function validateResult<V>(v: V) {
  return validate<Result & V>(v, id, hashResult)
}

export interface EmbedInfo {
  $type?: 'parts.page.mention.search#embedInfo'
  /** Source URL for the iframe embed */
  src: string
  /** Default width of the embed in pixels */
  width?: number
  /** Default height of the embed in pixels */
  height?: number
}

const hashEmbedInfo = 'embedInfo'

export function isEmbedInfo<V>(v: V) {
  return is$typed(v, id, hashEmbedInfo)
}

export function validateEmbedInfo<V>(v: V) {
  return validate<EmbedInfo & V>(v, id, hashEmbedInfo)
}
