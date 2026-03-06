/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  XrpcClient,
  type FetchHandler,
  type FetchHandlerOptions,
} from '@atproto/xrpc'
import { schemas } from './lexicons'
import { CID } from 'multiformats/cid'
import { type OmitKey, type Un$Typed } from './util'
import * as AppBskyActorProfile from './types/app/bsky/actor/profile'
import * as ComAtprotoLabelDefs from './types/com/atproto/label/defs'
import * as ComAtprotoRepoApplyWrites from './types/com/atproto/repo/applyWrites'
import * as ComAtprotoRepoCreateRecord from './types/com/atproto/repo/createRecord'
import * as ComAtprotoRepoDefs from './types/com/atproto/repo/defs'
import * as ComAtprotoRepoDeleteRecord from './types/com/atproto/repo/deleteRecord'
import * as ComAtprotoRepoDescribeRepo from './types/com/atproto/repo/describeRepo'
import * as ComAtprotoRepoGetRecord from './types/com/atproto/repo/getRecord'
import * as ComAtprotoRepoImportRepo from './types/com/atproto/repo/importRepo'
import * as ComAtprotoRepoListMissingBlobs from './types/com/atproto/repo/listMissingBlobs'
import * as ComAtprotoRepoListRecords from './types/com/atproto/repo/listRecords'
import * as ComAtprotoRepoPutRecord from './types/com/atproto/repo/putRecord'
import * as ComAtprotoRepoStrongRef from './types/com/atproto/repo/strongRef'
import * as ComAtprotoRepoUploadBlob from './types/com/atproto/repo/uploadBlob'
import * as PubLeafletBlocksBlockquote from './types/pub/leaflet/blocks/blockquote'
import * as PubLeafletBlocksBskyPost from './types/pub/leaflet/blocks/bskyPost'
import * as PubLeafletBlocksButton from './types/pub/leaflet/blocks/button'
import * as PubLeafletBlocksCode from './types/pub/leaflet/blocks/code'
import * as PubLeafletBlocksHeader from './types/pub/leaflet/blocks/header'
import * as PubLeafletBlocksHorizontalRule from './types/pub/leaflet/blocks/horizontalRule'
import * as PubLeafletBlocksIframe from './types/pub/leaflet/blocks/iframe'
import * as PubLeafletBlocksImage from './types/pub/leaflet/blocks/image'
import * as PubLeafletBlocksMath from './types/pub/leaflet/blocks/math'
import * as PubLeafletBlocksOrderedList from './types/pub/leaflet/blocks/orderedList'
import * as PubLeafletBlocksPage from './types/pub/leaflet/blocks/page'
import * as PubLeafletBlocksPoll from './types/pub/leaflet/blocks/poll'
import * as PubLeafletBlocksText from './types/pub/leaflet/blocks/text'
import * as PubLeafletBlocksUnorderedList from './types/pub/leaflet/blocks/unorderedList'
import * as PubLeafletBlocksWebsite from './types/pub/leaflet/blocks/website'
import * as PubLeafletComment from './types/pub/leaflet/comment'
import * as PubLeafletContent from './types/pub/leaflet/content'
import * as PubLeafletDocument from './types/pub/leaflet/document'
import * as PubLeafletGraphSubscription from './types/pub/leaflet/graph/subscription'
import * as PubLeafletInteractionsRecommend from './types/pub/leaflet/interactions/recommend'
import * as PubLeafletPagesCanvas from './types/pub/leaflet/pages/canvas'
import * as PubLeafletPagesLinearDocument from './types/pub/leaflet/pages/linearDocument'
import * as PubLeafletPollDefinition from './types/pub/leaflet/poll/definition'
import * as PubLeafletPollVote from './types/pub/leaflet/poll/vote'
import * as PubLeafletPublication from './types/pub/leaflet/publication'
import * as PubLeafletRichtextFacet from './types/pub/leaflet/richtext/facet'
import * as PubLeafletThemeBackgroundImage from './types/pub/leaflet/theme/backgroundImage'
import * as PubLeafletThemeColor from './types/pub/leaflet/theme/color'
import * as SiteStandardDocument from './types/site/standard/document'
import * as SiteStandardGraphSubscription from './types/site/standard/graph/subscription'
import * as SiteStandardPublication from './types/site/standard/publication'
import * as SiteStandardThemeBasic from './types/site/standard/theme/basic'
import * as SiteStandardThemeColor from './types/site/standard/theme/color'

export * as AppBskyActorProfile from './types/app/bsky/actor/profile'
export * as ComAtprotoLabelDefs from './types/com/atproto/label/defs'
export * as ComAtprotoRepoApplyWrites from './types/com/atproto/repo/applyWrites'
export * as ComAtprotoRepoCreateRecord from './types/com/atproto/repo/createRecord'
export * as ComAtprotoRepoDefs from './types/com/atproto/repo/defs'
export * as ComAtprotoRepoDeleteRecord from './types/com/atproto/repo/deleteRecord'
export * as ComAtprotoRepoDescribeRepo from './types/com/atproto/repo/describeRepo'
export * as ComAtprotoRepoGetRecord from './types/com/atproto/repo/getRecord'
export * as ComAtprotoRepoImportRepo from './types/com/atproto/repo/importRepo'
export * as ComAtprotoRepoListMissingBlobs from './types/com/atproto/repo/listMissingBlobs'
export * as ComAtprotoRepoListRecords from './types/com/atproto/repo/listRecords'
export * as ComAtprotoRepoPutRecord from './types/com/atproto/repo/putRecord'
export * as ComAtprotoRepoStrongRef from './types/com/atproto/repo/strongRef'
export * as ComAtprotoRepoUploadBlob from './types/com/atproto/repo/uploadBlob'
export * as PubLeafletBlocksBlockquote from './types/pub/leaflet/blocks/blockquote'
export * as PubLeafletBlocksBskyPost from './types/pub/leaflet/blocks/bskyPost'
export * as PubLeafletBlocksButton from './types/pub/leaflet/blocks/button'
export * as PubLeafletBlocksCode from './types/pub/leaflet/blocks/code'
export * as PubLeafletBlocksHeader from './types/pub/leaflet/blocks/header'
export * as PubLeafletBlocksHorizontalRule from './types/pub/leaflet/blocks/horizontalRule'
export * as PubLeafletBlocksIframe from './types/pub/leaflet/blocks/iframe'
export * as PubLeafletBlocksImage from './types/pub/leaflet/blocks/image'
export * as PubLeafletBlocksMath from './types/pub/leaflet/blocks/math'
export * as PubLeafletBlocksOrderedList from './types/pub/leaflet/blocks/orderedList'
export * as PubLeafletBlocksPage from './types/pub/leaflet/blocks/page'
export * as PubLeafletBlocksPoll from './types/pub/leaflet/blocks/poll'
export * as PubLeafletBlocksText from './types/pub/leaflet/blocks/text'
export * as PubLeafletBlocksUnorderedList from './types/pub/leaflet/blocks/unorderedList'
export * as PubLeafletBlocksWebsite from './types/pub/leaflet/blocks/website'
export * as PubLeafletComment from './types/pub/leaflet/comment'
export * as PubLeafletContent from './types/pub/leaflet/content'
export * as PubLeafletDocument from './types/pub/leaflet/document'
export * as PubLeafletGraphSubscription from './types/pub/leaflet/graph/subscription'
export * as PubLeafletInteractionsRecommend from './types/pub/leaflet/interactions/recommend'
export * as PubLeafletPagesCanvas from './types/pub/leaflet/pages/canvas'
export * as PubLeafletPagesLinearDocument from './types/pub/leaflet/pages/linearDocument'
export * as PubLeafletPollDefinition from './types/pub/leaflet/poll/definition'
export * as PubLeafletPollVote from './types/pub/leaflet/poll/vote'
export * as PubLeafletPublication from './types/pub/leaflet/publication'
export * as PubLeafletRichtextFacet from './types/pub/leaflet/richtext/facet'
export * as PubLeafletThemeBackgroundImage from './types/pub/leaflet/theme/backgroundImage'
export * as PubLeafletThemeColor from './types/pub/leaflet/theme/color'
export * as SiteStandardDocument from './types/site/standard/document'
export * as SiteStandardGraphSubscription from './types/site/standard/graph/subscription'
export * as SiteStandardPublication from './types/site/standard/publication'
export * as SiteStandardThemeBasic from './types/site/standard/theme/basic'
export * as SiteStandardThemeColor from './types/site/standard/theme/color'

export const PUB_LEAFLET_PAGES = {
  CanvasTextAlignLeft: 'pub.leaflet.pages.canvas#textAlignLeft',
  CanvasTextAlignCenter: 'pub.leaflet.pages.canvas#textAlignCenter',
  CanvasTextAlignRight: 'pub.leaflet.pages.canvas#textAlignRight',
  LinearDocumentTextAlignLeft: 'pub.leaflet.pages.linearDocument#textAlignLeft',
  LinearDocumentTextAlignCenter:
    'pub.leaflet.pages.linearDocument#textAlignCenter',
  LinearDocumentTextAlignRight:
    'pub.leaflet.pages.linearDocument#textAlignRight',
  LinearDocumentTextAlignJustify:
    'pub.leaflet.pages.linearDocument#textAlignJustify',
}

export class AtpBaseClient extends XrpcClient {
  app: AppNS
  com: ComNS
  pub: PubNS
  site: SiteNS

  constructor(options: FetchHandler | FetchHandlerOptions) {
    super(options, schemas)
    this.app = new AppNS(this)
    this.com = new ComNS(this)
    this.pub = new PubNS(this)
    this.site = new SiteNS(this)
  }

  /** @deprecated use `this` instead */
  get xrpc(): XrpcClient {
    return this
  }
}

export class AppNS {
  _client: XrpcClient
  bsky: AppBskyNS

  constructor(client: XrpcClient) {
    this._client = client
    this.bsky = new AppBskyNS(client)
  }
}

export class AppBskyNS {
  _client: XrpcClient
  actor: AppBskyActorNS

  constructor(client: XrpcClient) {
    this._client = client
    this.actor = new AppBskyActorNS(client)
  }
}

export class AppBskyActorNS {
  _client: XrpcClient
  profile: AppBskyActorProfileRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.profile = new AppBskyActorProfileRecord(client)
  }
}

export class AppBskyActorProfileRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: AppBskyActorProfile.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'app.bsky.actor.profile',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{ uri: string; cid: string; value: AppBskyActorProfile.Record }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'app.bsky.actor.profile',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<AppBskyActorProfile.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'app.bsky.actor.profile'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      {
        collection,
        rkey: 'self',
        ...params,
        record: { ...record, $type: collection },
      },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<AppBskyActorProfile.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'app.bsky.actor.profile'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'app.bsky.actor.profile', ...params },
      { headers },
    )
  }
}

export class ComNS {
  _client: XrpcClient
  atproto: ComAtprotoNS

  constructor(client: XrpcClient) {
    this._client = client
    this.atproto = new ComAtprotoNS(client)
  }
}

export class ComAtprotoNS {
  _client: XrpcClient
  repo: ComAtprotoRepoNS

  constructor(client: XrpcClient) {
    this._client = client
    this.repo = new ComAtprotoRepoNS(client)
  }
}

export class ComAtprotoRepoNS {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  applyWrites(
    data?: ComAtprotoRepoApplyWrites.InputSchema,
    opts?: ComAtprotoRepoApplyWrites.CallOptions,
  ): Promise<ComAtprotoRepoApplyWrites.Response> {
    return this._client
      .call('com.atproto.repo.applyWrites', opts?.qp, data, opts)
      .catch((e) => {
        throw ComAtprotoRepoApplyWrites.toKnownErr(e)
      })
  }

  createRecord(
    data?: ComAtprotoRepoCreateRecord.InputSchema,
    opts?: ComAtprotoRepoCreateRecord.CallOptions,
  ): Promise<ComAtprotoRepoCreateRecord.Response> {
    return this._client
      .call('com.atproto.repo.createRecord', opts?.qp, data, opts)
      .catch((e) => {
        throw ComAtprotoRepoCreateRecord.toKnownErr(e)
      })
  }

  deleteRecord(
    data?: ComAtprotoRepoDeleteRecord.InputSchema,
    opts?: ComAtprotoRepoDeleteRecord.CallOptions,
  ): Promise<ComAtprotoRepoDeleteRecord.Response> {
    return this._client
      .call('com.atproto.repo.deleteRecord', opts?.qp, data, opts)
      .catch((e) => {
        throw ComAtprotoRepoDeleteRecord.toKnownErr(e)
      })
  }

  describeRepo(
    params?: ComAtprotoRepoDescribeRepo.QueryParams,
    opts?: ComAtprotoRepoDescribeRepo.CallOptions,
  ): Promise<ComAtprotoRepoDescribeRepo.Response> {
    return this._client.call(
      'com.atproto.repo.describeRepo',
      params,
      undefined,
      opts,
    )
  }

  getRecord(
    params?: ComAtprotoRepoGetRecord.QueryParams,
    opts?: ComAtprotoRepoGetRecord.CallOptions,
  ): Promise<ComAtprotoRepoGetRecord.Response> {
    return this._client
      .call('com.atproto.repo.getRecord', params, undefined, opts)
      .catch((e) => {
        throw ComAtprotoRepoGetRecord.toKnownErr(e)
      })
  }

  importRepo(
    data?: ComAtprotoRepoImportRepo.InputSchema,
    opts?: ComAtprotoRepoImportRepo.CallOptions,
  ): Promise<ComAtprotoRepoImportRepo.Response> {
    return this._client.call(
      'com.atproto.repo.importRepo',
      opts?.qp,
      data,
      opts,
    )
  }

  listMissingBlobs(
    params?: ComAtprotoRepoListMissingBlobs.QueryParams,
    opts?: ComAtprotoRepoListMissingBlobs.CallOptions,
  ): Promise<ComAtprotoRepoListMissingBlobs.Response> {
    return this._client.call(
      'com.atproto.repo.listMissingBlobs',
      params,
      undefined,
      opts,
    )
  }

  listRecords(
    params?: ComAtprotoRepoListRecords.QueryParams,
    opts?: ComAtprotoRepoListRecords.CallOptions,
  ): Promise<ComAtprotoRepoListRecords.Response> {
    return this._client.call(
      'com.atproto.repo.listRecords',
      params,
      undefined,
      opts,
    )
  }

  putRecord(
    data?: ComAtprotoRepoPutRecord.InputSchema,
    opts?: ComAtprotoRepoPutRecord.CallOptions,
  ): Promise<ComAtprotoRepoPutRecord.Response> {
    return this._client
      .call('com.atproto.repo.putRecord', opts?.qp, data, opts)
      .catch((e) => {
        throw ComAtprotoRepoPutRecord.toKnownErr(e)
      })
  }

  uploadBlob(
    data?: ComAtprotoRepoUploadBlob.InputSchema,
    opts?: ComAtprotoRepoUploadBlob.CallOptions,
  ): Promise<ComAtprotoRepoUploadBlob.Response> {
    return this._client.call(
      'com.atproto.repo.uploadBlob',
      opts?.qp,
      data,
      opts,
    )
  }
}

export class PubNS {
  _client: XrpcClient
  leaflet: PubLeafletNS

  constructor(client: XrpcClient) {
    this._client = client
    this.leaflet = new PubLeafletNS(client)
  }
}

export class PubLeafletNS {
  _client: XrpcClient
  comment: PubLeafletCommentRecord
  document: PubLeafletDocumentRecord
  publication: PubLeafletPublicationRecord
  blocks: PubLeafletBlocksNS
  graph: PubLeafletGraphNS
  interactions: PubLeafletInteractionsNS
  pages: PubLeafletPagesNS
  poll: PubLeafletPollNS
  richtext: PubLeafletRichtextNS
  theme: PubLeafletThemeNS

  constructor(client: XrpcClient) {
    this._client = client
    this.blocks = new PubLeafletBlocksNS(client)
    this.graph = new PubLeafletGraphNS(client)
    this.interactions = new PubLeafletInteractionsNS(client)
    this.pages = new PubLeafletPagesNS(client)
    this.poll = new PubLeafletPollNS(client)
    this.richtext = new PubLeafletRichtextNS(client)
    this.theme = new PubLeafletThemeNS(client)
    this.comment = new PubLeafletCommentRecord(client)
    this.document = new PubLeafletDocumentRecord(client)
    this.publication = new PubLeafletPublicationRecord(client)
  }
}

export class PubLeafletBlocksNS {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }
}

export class PubLeafletGraphNS {
  _client: XrpcClient
  subscription: PubLeafletGraphSubscriptionRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.subscription = new PubLeafletGraphSubscriptionRecord(client)
  }
}

export class PubLeafletGraphSubscriptionRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLeafletGraphSubscription.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.leaflet.graph.subscription',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLeafletGraphSubscription.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.leaflet.graph.subscription',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletGraphSubscription.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.graph.subscription'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletGraphSubscription.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.graph.subscription'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.leaflet.graph.subscription', ...params },
      { headers },
    )
  }
}

export class PubLeafletInteractionsNS {
  _client: XrpcClient
  recommend: PubLeafletInteractionsRecommendRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.recommend = new PubLeafletInteractionsRecommendRecord(client)
  }
}

export class PubLeafletInteractionsRecommendRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLeafletInteractionsRecommend.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.leaflet.interactions.recommend',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLeafletInteractionsRecommend.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.leaflet.interactions.recommend',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletInteractionsRecommend.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.interactions.recommend'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletInteractionsRecommend.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.interactions.recommend'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.leaflet.interactions.recommend', ...params },
      { headers },
    )
  }
}

export class PubLeafletPagesNS {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }
}

export class PubLeafletPollNS {
  _client: XrpcClient
  definition: PubLeafletPollDefinitionRecord
  vote: PubLeafletPollVoteRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.definition = new PubLeafletPollDefinitionRecord(client)
    this.vote = new PubLeafletPollVoteRecord(client)
  }
}

export class PubLeafletPollDefinitionRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLeafletPollDefinition.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.leaflet.poll.definition',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLeafletPollDefinition.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.leaflet.poll.definition',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletPollDefinition.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.poll.definition'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletPollDefinition.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.poll.definition'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.leaflet.poll.definition', ...params },
      { headers },
    )
  }
}

export class PubLeafletPollVoteRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLeafletPollVote.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.leaflet.poll.vote',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{ uri: string; cid: string; value: PubLeafletPollVote.Record }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.leaflet.poll.vote',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletPollVote.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.poll.vote'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletPollVote.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.poll.vote'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.leaflet.poll.vote', ...params },
      { headers },
    )
  }
}

export class PubLeafletRichtextNS {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }
}

export class PubLeafletThemeNS {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }
}

export class PubLeafletCommentRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLeafletComment.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.leaflet.comment',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{ uri: string; cid: string; value: PubLeafletComment.Record }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.leaflet.comment',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletComment.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.comment'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletComment.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.comment'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.leaflet.comment', ...params },
      { headers },
    )
  }
}

export class PubLeafletDocumentRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLeafletDocument.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.leaflet.document',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{ uri: string; cid: string; value: PubLeafletDocument.Record }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.leaflet.document',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletDocument.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.document'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletDocument.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.document'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.leaflet.document', ...params },
      { headers },
    )
  }
}

export class PubLeafletPublicationRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLeafletPublication.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.leaflet.publication',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLeafletPublication.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.leaflet.publication',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletPublication.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.publication'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLeafletPublication.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.leaflet.publication'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.leaflet.publication', ...params },
      { headers },
    )
  }
}

export class SiteNS {
  _client: XrpcClient
  standard: SiteStandardNS

  constructor(client: XrpcClient) {
    this._client = client
    this.standard = new SiteStandardNS(client)
  }
}

export class SiteStandardNS {
  _client: XrpcClient
  document: SiteStandardDocumentRecord
  publication: SiteStandardPublicationRecord
  graph: SiteStandardGraphNS
  theme: SiteStandardThemeNS

  constructor(client: XrpcClient) {
    this._client = client
    this.graph = new SiteStandardGraphNS(client)
    this.theme = new SiteStandardThemeNS(client)
    this.document = new SiteStandardDocumentRecord(client)
    this.publication = new SiteStandardPublicationRecord(client)
  }
}

export class SiteStandardGraphNS {
  _client: XrpcClient
  subscription: SiteStandardGraphSubscriptionRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.subscription = new SiteStandardGraphSubscriptionRecord(client)
  }
}

export class SiteStandardGraphSubscriptionRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: SiteStandardGraphSubscription.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'site.standard.graph.subscription',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: SiteStandardGraphSubscription.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'site.standard.graph.subscription',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<SiteStandardGraphSubscription.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'site.standard.graph.subscription'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<SiteStandardGraphSubscription.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'site.standard.graph.subscription'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'site.standard.graph.subscription', ...params },
      { headers },
    )
  }
}

export class SiteStandardThemeNS {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }
}

export class SiteStandardDocumentRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: SiteStandardDocument.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'site.standard.document',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{ uri: string; cid: string; value: SiteStandardDocument.Record }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'site.standard.document',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<SiteStandardDocument.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'site.standard.document'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<SiteStandardDocument.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'site.standard.document'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'site.standard.document', ...params },
      { headers },
    )
  }
}

export class SiteStandardPublicationRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: SiteStandardPublication.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'site.standard.publication',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: SiteStandardPublication.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'site.standard.publication',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<SiteStandardPublication.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'site.standard.publication'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<SiteStandardPublication.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'site.standard.publication'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'site.standard.publication', ...params },
      { headers },
    )
  }
}
