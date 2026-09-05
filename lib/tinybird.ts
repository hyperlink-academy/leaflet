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
  defineToken,
  node,
  t,
  p,
  engine,
  type InferRow,
  type InferParams,
  type InferOutputRow,
  TokenDefinition,
} from "@tinybirdco/sdk";

// The token the app runs with (TINYBIRD_TOKEN in prod and the appview): reads
// every endpoint and appends subscription events.
const PROD_TOKEN = defineToken("prod_read_token_v1");
const PROD_TOKEN_READ = { token: PROD_TOKEN, scope: "READ" } as const;

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
    sessionId: t.uint64().nullable(),
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

/**
 * Subscription events, ingested server-side (see src/subscriptionAnalytics.ts).
 *
 * `origin` distinguishes subscriptions our own code created ("app") from ones
 * observed on the firehose that were created elsewhere ("firehose"). The
 * appview only ingests firehose events whose subscription row didn't already
 * exist, so app-created records aren't double counted when they echo back.
 */
export const subscriptionEvents = defineDatasource("subscription_events", {
  description: "Publication subscribe/unsubscribe events",
  schema: {
    timestamp: t.uint64(),
    event: t.string().lowCardinality(), // subscribe | unsubscribe
    method: t.string().lowCardinality(), // atproto | email
    origin: t.string().lowCardinality(), // app | firehose
    publication_uri: t.string(),
    publication_did: t.string().default(""),
    // Stable per-subscriber id for uniq(): a DID, or sha256 of the email.
    subscriber: t.string().default(""),
    // AT-URI of the subscription record (empty for email-only subscriptions).
    record_uri: t.string().default(""),
    source_placement: t.string().lowCardinality().default(""),
    // Referring publication when the subscribe came from another
    // publication's recommendations.
    source_publication: t.string().default(""),
    source_url: t.string().default(""),
  },
  engine: engine.mergeTree({
    sortingKey: ["publication_uri", "timestamp"],
    partitionKey: "toYYYYMM(fromUnixTimestamp64Milli(timestamp))",
  }),
  tokens: [{ token: PROD_TOKEN, scope: "APPEND" }],
});

export type SubscriptionEventsRow = InferRow<typeof subscriptionEvents>;

/**
 * Active-user events for signed-in sessions (see src/activeUserAnalytics.ts).
 *
 * Written unthrottled — every replicache push that ran mutations is a `writer`
 * row, every published-page identity fetch / view-only leaflet / reader-feed
 * load is a `reader` row — so the table is noisy and short-lived; the
 * endpoints below dedupe per (day, identity) at query time.
 */
export const activeUserEvents = defineDatasource("active_user_events", {
  description: "Raw writer/reader activity events per signed-in identity",
  schema: {
    timestamp: t.uint64(),
    identity_id: t.string(),
    did: t.string().default(""),
    role: t.string().lowCardinality(), // writer | reader
    surface: t.string().lowCardinality(), // editor | published | view_only | reader
  },
  engine: engine.mergeTree({
    sortingKey: ["timestamp", "identity_id"],
    partitionKey: "toYYYYMM(fromUnixTimestamp64Milli(timestamp))",
    ttl: "toDateTime(intDiv(timestamp, 1000)) + INTERVAL 90 DAY",
  }),
  tokens: [{ token: PROD_TOKEN, scope: "APPEND" }],
});

export type ActiveUserEventsRow = InferRow<typeof activeUserEvents>;

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
    referrer_host: p.string().optional(),
    bsky_post: p.string().optional(),
  },
  tokens: [PROD_TOKEN_READ],
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
          {% if defined(referrer_host) %}
            AND domain(referrer) = {{String(referrer_host)}}
          {% end %}
          {% if defined(bsky_post) %}
            AND JSONExtractString(queryParams, 'utm_source') = 'bluesky'
            AND JSONExtractString(queryParams, 'utm_content') = {{String(bsky_post)}}
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
    tokens: [PROD_TOKEN_READ],
    description: "Top referrers for a publication domain",
    params: {
      domains: p.string(),
      date_from: p.string().optional(),
      date_to: p.string().optional(),
      path: p.string().optional(),
      referrer_host: p.string().optional(),
      bsky_post: p.string().optional(),
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
          {% if defined(referrer_host) %}
            AND domain(referrer) = {{String(referrer_host)}}
          {% end %}
          {% if defined(bsky_post) %}
            AND JSONExtractString(queryParams, 'utm_source') = 'bluesky'
            AND JSONExtractString(queryParams, 'utm_content') = {{String(bsky_post)}}
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
  tokens: [PROD_TOKEN_READ],
  params: {
    domains: p.string(),
    date_from: p.string().optional(),
    date_to: p.string().optional(),
    referrer_host: p.string().optional(),
    bsky_post: p.string().optional(),
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
          {% if defined(referrer_host) %}
            AND domain(referrer) = {{String(referrer_host)}}
          {% end %}
          {% if defined(bsky_post) %}
            AND JSONExtractString(queryParams, 'utm_source') = 'bluesky'
            AND JSONExtractString(queryParams, 'utm_content') = {{String(bsky_post)}}
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

/**
 * publication_bsky_traffic – pageviews attributed to specific Bluesky posts.
 *
 * Links we embed in Bluesky posts carry utm_source=bluesky and
 * utm_content=<did>/<rkey> (see src/utils/bskyPostUtm.ts), so grouping by
 * utm_content yields per-post traffic. queryParams is a JSON-encoded object.
 */
export const publicationBskyTraffic = defineEndpoint(
  "publication_bsky_traffic",
  {
    description: "Pageviews per referring Bluesky post for a publication",
    tokens: [PROD_TOKEN_READ],
    params: {
      domains: p.string(),
      date_from: p.string().optional(),
      date_to: p.string().optional(),
      path: p.string().optional(),
      limit: p.int32().optional(25),
    },
    nodes: [
      node({
        name: "endpoint",
        sql: `
        SELECT
          JSONExtractString(queryParams, 'utm_content') AS post_ref,
          count() AS pageviews,
          uniq(deviceId) AS visitors
        FROM analytics_events
        WHERE eventType = 'pageview'
          AND domain(origin) IN splitByChar(',', {{String(domains)}})
          AND JSONExtractString(queryParams, 'utm_source') = 'bluesky'
          AND JSONExtractString(queryParams, 'utm_content') != ''
          {% if defined(date_from) %}
            AND fromUnixTimestamp64Milli(timestamp) >= parseDateTimeBestEffort({{String(date_from)}})
          {% end %}
          {% if defined(date_to) %}
            AND fromUnixTimestamp64Milli(timestamp) <= parseDateTimeBestEffort({{String(date_to)}})
          {% end %}
          {% if defined(path) %}
            AND path = {{String(path)}}
          {% end %}
        GROUP BY post_ref
        ORDER BY pageviews DESC
        LIMIT {{Int32(limit, 25)}}
      `,
      }),
    ],
    output: {
      post_ref: t.string(),
      pageviews: t.uint64(),
      visitors: t.uint64(),
    },
  },
);

export type PublicationBskyTrafficParams = InferParams<
  typeof publicationBskyTraffic
>;
export type PublicationBskyTrafficOutput = InferOutputRow<
  typeof publicationBskyTraffic
>;

/**
 * publication_subscribes_timeseries – daily subscribe/unsubscribe counts for a
 * publication, split by method.
 */
export const publicationSubscribesTimeseries = defineEndpoint(
  "publication_subscribes_timeseries",
  {
    description: "Daily subscription event counts for a publication",
    tokens: [PROD_TOKEN_READ],
    params: {
      publication_uri: p.string(),
      date_from: p.string().optional(),
      date_to: p.string().optional(),
    },
    nodes: [
      node({
        name: "endpoint",
        sql: `
        SELECT
          toDate(fromUnixTimestamp64Milli(timestamp)) AS day,
          countIf(event = 'subscribe' AND method = 'email') AS email_subscribes,
          countIf(event = 'subscribe' AND method = 'atproto') AS atproto_subscribes,
          countIf(event = 'unsubscribe') AS unsubscribes
        FROM subscription_events
        WHERE publication_uri = {{String(publication_uri)}}
          {% if defined(date_from) %}
            AND fromUnixTimestamp64Milli(timestamp) >= parseDateTimeBestEffort({{String(date_from)}})
          {% end %}
          {% if defined(date_to) %}
            AND fromUnixTimestamp64Milli(timestamp) <= parseDateTimeBestEffort({{String(date_to)}})
          {% end %}
        GROUP BY day
        ORDER BY day ASC
      `,
      }),
    ],
    output: {
      day: t.date(),
      email_subscribes: t.uint64(),
      atproto_subscribes: t.uint64(),
      unsubscribes: t.uint64(),
    },
  },
);

export type PublicationSubscribesTimeseriesParams = InferParams<
  typeof publicationSubscribesTimeseries
>;
export type PublicationSubscribesTimeseriesOutput = InferOutputRow<
  typeof publicationSubscribesTimeseries
>;

/**
 * publication_subscribe_sources – where a publication's subscribes came from:
 * placement on the page, referring publication (recommendations), and whether
 * the subscription was created in-app or observed on the firehose.
 */
export const publicationSubscribeSources = defineEndpoint(
  "publication_subscribe_sources",
  {
    description: "Subscribe counts by source placement for a publication",
    tokens: [PROD_TOKEN_READ],
    params: {
      publication_uri: p.string(),
      date_from: p.string().optional(),
      date_to: p.string().optional(),
      limit: p.int32().optional(50),
    },
    nodes: [
      node({
        name: "endpoint",
        sql: `
        SELECT
          origin,
          source_placement,
          source_publication,
          method,
          count() AS subscribes,
          uniq(subscriber) AS subscribers
        FROM subscription_events
        WHERE event = 'subscribe'
          AND publication_uri = {{String(publication_uri)}}
          {% if defined(date_from) %}
            AND fromUnixTimestamp64Milli(timestamp) >= parseDateTimeBestEffort({{String(date_from)}})
          {% end %}
          {% if defined(date_to) %}
            AND fromUnixTimestamp64Milli(timestamp) <= parseDateTimeBestEffort({{String(date_to)}})
          {% end %}
        GROUP BY origin, source_placement, source_publication, method
        ORDER BY subscribes DESC
        LIMIT {{Int32(limit, 50)}}
      `,
      }),
    ],
    output: {
      origin: t.string(),
      source_placement: t.string(),
      source_publication: t.string(),
      method: t.string(),
      subscribes: t.uint64(),
      subscribers: t.uint64(),
    },
  },
);

export type PublicationSubscribeSourcesParams = InferParams<
  typeof publicationSubscribeSources
>;
export type PublicationSubscribeSourcesOutput = InferOutputRow<
  typeof publicationSubscribeSources
>;

// ============================================================================
// Active users
// ============================================================================

const ACTIVE_USER_DAY_SQL = "toDate(fromUnixTimestamp64Milli(timestamp))";

// Per-identity role flags feed the same split in every endpoint below.
const ACTIVE_USER_SPLIT_SQL = `
  count() AS active,
  countIf(is_writer AND is_reader) AS both_roles,
  countIf(is_writer AND NOT is_reader) AS writers_only,
  countIf(is_reader AND NOT is_writer) AS readers_only,
  countIf(is_writer) AS writers,
  countIf(is_reader) AS readers
`;

const ACTIVE_USER_SPLIT_OUTPUT = {
  active: t.uint64(),
  both_roles: t.uint64(),
  writers_only: t.uint64(),
  readers_only: t.uint64(),
  writers: t.uint64(),
  readers: t.uint64(),
};

/**
 * active_users_timeseries – per calendar period (weeks start on Monday), how
 * many distinct identities were active and how they split into writers only,
 * readers only, and both.
 */
export const activeUsersTimeseries = defineEndpoint("active_users_timeseries", {
  description:
    "Active identities per day/week/month split by writer/reader role",
  tokens: [PROD_TOKEN_READ],
  params: {
    granularity: p.string().optional("day"), // day | week | month
    date_from: p.string().optional(),
    date_to: p.string().optional(),
  },
  nodes: [
    node({
      name: "per_identity",
      sql: `
        SELECT
          multiIf(
            {{String(granularity, 'day')}} = 'month', toStartOfMonth(${ACTIVE_USER_DAY_SQL}),
            {{String(granularity, 'day')}} = 'week', toMonday(${ACTIVE_USER_DAY_SQL}),
            ${ACTIVE_USER_DAY_SQL}
          ) AS period,
          identity_id,
          max(role = 'writer') AS is_writer,
          max(role = 'reader') AS is_reader
        FROM active_user_events
        WHERE 1
          {% if defined(date_from) %}
            AND ${ACTIVE_USER_DAY_SQL} >= toDate({{String(date_from)}})
          {% end %}
          {% if defined(date_to) %}
            AND ${ACTIVE_USER_DAY_SQL} <= toDate({{String(date_to)}})
          {% end %}
        GROUP BY period, identity_id
      `,
    }),
    node({
      name: "endpoint",
      sql: `
        SELECT period, ${ACTIVE_USER_SPLIT_SQL}
        FROM per_identity
        GROUP BY period
        ORDER BY period ASC
      `,
    }),
  ],
  output: { period: t.date(), ...ACTIVE_USER_SPLIT_OUTPUT },
});

export type ActiveUsersTimeseriesParams = InferParams<
  typeof activeUsersTimeseries
>;
export type ActiveUsersTimeseriesOutput = InferOutputRow<
  typeof activeUsersTimeseries
>;

/**
 * active_users_windows – the same split over the last 1, 7 and 30 calendar
 * days (UTC, including today), one row per window.
 */
export const activeUsersWindows = defineEndpoint("active_users_windows", {
  description: "Active identities over the last 1/7/30 calendar days",
  tokens: [PROD_TOKEN_READ],
  params: {},
  nodes: [
    node({
      name: "per_identity",
      sql: `
        SELECT
          window_days,
          identity_id,
          max(role = 'writer') AS is_writer,
          max(role = 'reader') AS is_reader
        FROM active_user_events
        ARRAY JOIN [1, 7, 30] AS window_days
        WHERE ${ACTIVE_USER_DAY_SQL} > today() - window_days
        GROUP BY window_days, identity_id
      `,
    }),
    node({
      name: "endpoint",
      sql: `
        SELECT window_days, ${ACTIVE_USER_SPLIT_SQL}
        FROM per_identity
        GROUP BY window_days
        ORDER BY window_days ASC
      `,
    }),
  ],
  output: { window_days: t.uint8(), ...ACTIVE_USER_SPLIT_OUTPUT },
});

export type ActiveUsersWindowsOutput = InferOutputRow<
  typeof activeUsersWindows
>;

/**
 * active_users_recent – the most recently active identities, which roles they
 * held in the window, and on how many days.
 */
export const activeUsersRecent = defineEndpoint("active_users_recent", {
  description: "Most recently active identities with their roles",
  tokens: [PROD_TOKEN_READ],
  params: {
    window_days: p.int32().optional(7),
    limit: p.int32().optional(50),
  },
  nodes: [
    node({
      name: "endpoint",
      sql: `
        SELECT
          identity_id,
          anyLast(did) AS did,
          max(timestamp) AS last_seen,
          max(role = 'writer') AS is_writer,
          max(role = 'reader') AS is_reader,
          uniqExactIf(${ACTIVE_USER_DAY_SQL}, role = 'writer') AS writer_days,
          uniqExactIf(${ACTIVE_USER_DAY_SQL}, role = 'reader') AS reader_days
        FROM active_user_events
        WHERE ${ACTIVE_USER_DAY_SQL} > today() - {{Int32(window_days, 7)}}
        GROUP BY identity_id
        ORDER BY last_seen DESC
        LIMIT {{Int32(limit, 50)}}
      `,
    }),
  ],
  output: {
    identity_id: t.string(),
    did: t.string(),
    last_seen: t.uint64(),
    is_writer: t.uint8(),
    is_reader: t.uint8(),
    writer_days: t.uint64(),
    reader_days: t.uint64(),
  },
});

export type ActiveUsersRecentParams = InferParams<typeof activeUsersRecent>;
export type ActiveUsersRecentOutput = InferOutputRow<typeof activeUsersRecent>;

// ============================================================================
// Client
// ============================================================================

export const tinybird = new Tinybird({
  datasources: { analyticsEvents, subscriptionEvents, activeUserEvents },
  pipes: {
    publicationTraffic,
    publicationTopReferrers,
    publicationTopPages,
    publicationBskyTraffic,
    publicationSubscribesTimeseries,
    publicationSubscribeSources,
    activeUsersTimeseries,
    activeUsersWindows,
    activeUsersRecent,
  },
  devMode: false,
});
