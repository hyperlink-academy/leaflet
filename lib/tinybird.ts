/**
 * Tinybird Definitions
 *
 * Datasource matching the Vercel Web Analytics drain schema,
 * endpoint pipes for publication analytics, and typed client.
 *
 * Column names use camelCase to match the JSON keys sent by
 * Vercel's analytics drain (NDJSON format).
 */

import {
  defineDatasource,
  defineEndpoint,
  Tinybird,
  node,
  t,
  p,
  engine,
  type InferRow,
  type InferParams,
  type InferOutputRow,
  TokenDefinition,
} from "@tinybirdco/sdk";

const PROD_READ_TOKEN = { name: "prod_read_token_v1", scopes: ["READ"] };

// ============================================================================
// Datasources
// ============================================================================

/**
 * Vercel Web Analytics drain events.
 * Column names match the Vercel drain JSON keys exactly.
 * `timestamp` is stored as UInt64 (Unix millis) as sent by Vercel.
 */
export const analyticsEvents = defineDatasource("analytics_events", {
  description: "Vercel Web Analytics drain events",
  schema: {
    timestamp: t.uint64(),
    eventType: t.string().lowCardinality(),
    eventName: t.string().default(""),
    eventData: t.string().default(""),
    sessionId: t.uint64(),
    deviceId: t.uint64(),
    origin: t.string(),
    path: t.string(),
    referrer: t.string().default(""),
    queryParams: t.string().default(""),
    route: t.string().default(""),
    country: t.string().lowCardinality().default(""),
    region: t.string().default(""),
    city: t.string().default(""),
    osName: t.string().lowCardinality().default(""),
    osVersion: t.string().default(""),
    clientName: t.string().lowCardinality().default(""),
    clientType: t.string().lowCardinality().default(""),
    clientVersion: t.string().default(""),
    deviceType: t.string().lowCardinality().default(""),
    deviceBrand: t.string().default(""),
    deviceModel: t.string().default(""),
    browserEngine: t.string().default(""),
    browserEngineVersion: t.string().default(""),
    sdkVersion: t.string().default(""),
    sdkName: t.string().default(""),
    sdkVersionFull: t.string().default(""),
    vercelEnvironment: t.string().lowCardinality().default(""),
    vercelUrl: t.string().default(""),
    flags: t.string().default(""),
    deployment: t.string().default(""),
    schema: t.string().default(""),
    projectId: t.string().default(""),
    ownerId: t.string().default(""),
    dataSourceName: t.string().default(""),
  },
  engine: engine.mergeTree({
    sortingKey: ["origin", "timestamp"],
    partitionKey: "toYYYYMM(fromUnixTimestamp64Milli(timestamp))",
  }),
});

export type AnalyticsEventsRow = InferRow<typeof analyticsEvents>;

// ============================================================================
// Endpoints
// ============================================================================

/**
 * publication_traffic – daily pageview time series for a publication domain.
 */
export const publicationTraffic = defineEndpoint("publication_traffic", {
  description: "Daily pageview time series for a publication domain",
  params: {
    domains: p.string(),
    date_from: p.string().optional(),
    date_to: p.string().optional(),
    path: p.string().optional(),
  },
  tokens: [PROD_READ_TOKEN],
  nodes: [
    node({
      name: "endpoint",
      sql: `
        SELECT
          toDate(fromUnixTimestamp64Milli(timestamp)) AS day,
          count() AS pageviews,
          uniq(deviceId) AS visitors
        FROM analytics_events
        WHERE eventType = 'pageview'
          AND domain(origin) IN splitByChar(',', {{String(domains)}})
          {% if defined(date_from) %}
            AND fromUnixTimestamp64Milli(timestamp) >= parseDateTimeBestEffort({{String(date_from)}})
          {% end %}
          {% if defined(date_to) %}
            AND fromUnixTimestamp64Milli(timestamp) <= parseDateTimeBestEffort({{String(date_to)}})
          {% end %}
          {% if defined(path) %}
            AND path = {{String(path)}}
          {% end %}
        GROUP BY day
        ORDER BY day ASC
      `,
    }),
  ],
  output: {
    day: t.date(),
    pageviews: t.uint64(),
    visitors: t.uint64(),
  },
});

export type PublicationTrafficParams = InferParams<typeof publicationTraffic>;
export type PublicationTrafficOutput = InferOutputRow<
  typeof publicationTraffic
>;

/**
 * publication_top_referrers – top referring domains for a publication.
 */
export const publicationTopReferrers = defineEndpoint(
  "publication_top_referrers",
  {
    tokens: [PROD_READ_TOKEN],
    description: "Top referrers for a publication domain",
    params: {
      domains: p.string(),
      date_from: p.string().optional(),
      date_to: p.string().optional(),
      path: p.string().optional(),
      limit: p.int32().optional(10),
    },
    nodes: [
      node({
        name: "endpoint",
        sql: `
        SELECT
          domain(referrer) AS referrer_host,
          count() AS pageviews
        FROM analytics_events
        WHERE eventType = 'pageview'
          AND domain(origin) IN splitByChar(',', {{String(domains)}})
          AND referrer != ''
          AND domain(referrer) NOT IN splitByChar(',', {{String(domains)}})
          {% if defined(date_from) %}
            AND fromUnixTimestamp64Milli(timestamp) >= parseDateTimeBestEffort({{String(date_from)}})
          {% end %}
          {% if defined(date_to) %}
            AND fromUnixTimestamp64Milli(timestamp) <= parseDateTimeBestEffort({{String(date_to)}})
          {% end %}
          {% if defined(path) %}
            AND path = {{String(path)}}
          {% end %}
        GROUP BY referrer_host
        ORDER BY pageviews DESC
        LIMIT {{Int32(limit, 10)}}
      `,
      }),
    ],
    output: {
      referrer_host: t.string(),
      pageviews: t.uint64(),
    },
  },
);

export type PublicationTopReferrersParams = InferParams<
  typeof publicationTopReferrers
>;
export type PublicationTopReferrersOutput = InferOutputRow<
  typeof publicationTopReferrers
>;

/**
 * publication_top_pages – top pages by pageviews for a publication.
 */
export const publicationTopPages = defineEndpoint("publication_top_pages", {
  description: "Top pages for a publication domain",
  tokens: [PROD_READ_TOKEN],
  params: {
    domains: p.string(),
    date_from: p.string().optional(),
    date_to: p.string().optional(),
    limit: p.int32().optional(10),
  },
  nodes: [
    node({
      name: "endpoint",
      sql: `
        SELECT
          path,
          count() AS pageviews
        FROM analytics_events
        WHERE eventType = 'pageview'
          AND domain(origin) IN splitByChar(',', {{String(domains)}})
          {% if defined(date_from) %}
            AND fromUnixTimestamp64Milli(timestamp) >= parseDateTimeBestEffort({{String(date_from)}})
          {% end %}
          {% if defined(date_to) %}
            AND fromUnixTimestamp64Milli(timestamp) <= parseDateTimeBestEffort({{String(date_to)}})
          {% end %}
        GROUP BY path
        ORDER BY pageviews DESC
        LIMIT {{Int32(limit, 10)}}
      `,
    }),
  ],
  output: {
    path: t.string(),
    pageviews: t.uint64(),
  },
});

export type PublicationTopPagesParams = InferParams<typeof publicationTopPages>;
export type PublicationTopPagesOutput = InferOutputRow<
  typeof publicationTopPages
>;

// ============================================================================
// Client
// ============================================================================

export const tinybird = new Tinybird({
  datasources: { analyticsEvents },
  pipes: { publicationTraffic, publicationTopReferrers, publicationTopPages },
  devMode: false,
});
