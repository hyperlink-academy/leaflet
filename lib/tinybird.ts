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
// every endpoint and appends user events.
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
 * Retired 2026-09-10: subscribe/unsubscribe are user_events now, and the
 * app-origin rows here were backfilled into it
 * (scripts/backfill-user-events-subscriptions.mts). Nothing writes or reads
 * this datasource; the definition stays so a deploy keeps the raw history.
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
});

export type SubscriptionEventsRow = InferRow<typeof subscriptionEvents>;

/**
 * Signed-in user events, ingested server-side (see src/activeUserAnalytics.ts).
 * `event` names what happened; `properties` carries per-event context so new
 * attributes don't need schema changes. Unthrottled, so the endpoints below
 * dedupe per identity at query time.
 */
export const userEvents = defineDatasource("user_events", {
  description: "Product events for signed-in identities",
  schema: {
    timestamp: t.uint64(),
    identity_id: t.string(),
    did: t.string().default(""),
    event: t.string().lowCardinality(), // see UserEvent in src/activeUserAnalytics.ts
    properties: t.map(t.string(), t.string()),
  },
  engine: engine.mergeTree({
    sortingKey: ["timestamp", "identity_id"],
    partitionKey: "toYYYYMM(fromUnixTimestamp64Milli(timestamp))",
  }),
  tokens: [{ token: PROD_TOKEN, scope: "APPEND" }],
});

export type UserEventsRow = InferRow<typeof userEvents>;

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

// ============================================================================
// Active users
// ============================================================================

const USER_EVENT_DAY_SQL = "toDate(fromUnixTimestamp64Milli(timestamp))";

// One activity metric per dashboard row: the event that counts toward it and,
// optionally, a property the event must carry. Drives both the per-period
// counts and the raw event listing so the two can't disagree about what a
// metric means.
export const ACTIVITY_METRICS = {
  signups: { event: "signup" },
  documents_created: { event: "create_document" },
  // Republishing an edit is a `publish` event too, but not a new post.
  posts_published: { event: "publish", where: ["first_publish", "true"] },
  publications_created: { event: "create_publication" },
  subscribes: { event: "subscribe" },
  unsubscribes: { event: "unsubscribe" },
  memberships_joined: { event: "join_membership" },
  pro_upgrades: { event: "pro_upgrade" },
  pro_cancels: { event: "pro_cancel" },
  connect_onboardings_started: { event: "connect_onboarding_started" },
  connect_accounts_enabled: { event: "connect_account_enabled" },
} as const satisfies Record<
  string,
  { event: string; where?: readonly [key: string, value: string] }
>;
export type ActivityMetric = keyof typeof ACTIVITY_METRICS;

// Per-period event counts (not distinct identities) shared by both active-user
// endpoints.
const ACTIVITY_COUNT_SQL = Object.entries(ACTIVITY_METRICS)
  .map(([key, m]) => {
    let where =
      "where" in m ? ` AND properties['${m.where[0]}'] = '${m.where[1]}'` : "";
    return `          countIf(event = '${m.event}'${where}) AS ${key}`;
  })
  .join(",\n");
const ACTIVITY_COUNT_OUTPUT = Object.fromEntries(
  Object.keys(ACTIVITY_METRICS).map((key) => [key, t.uint64()]),
) as Record<ActivityMetric, ReturnType<typeof t.uint64>>;

/**
 * active_users_timeseries – distinct identities with any event per calendar
 * period (weeks start on Monday), plus activity counts for the period.
 * `pro_active` counts identities that were Pro on at least one event in the
 * period (events are stamped with the status at the time), so an identity that
 * flips mid-period counts as Pro.
 */
export const activeUsersTimeseries = defineEndpoint("active_users_timeseries", {
  description: "Distinct active identities per day/week/month",
  tokens: [PROD_TOKEN_READ],
  params: {
    granularity: p.string().optional("day"), // day | week | month
    date_from: p.string().optional(),
    date_to: p.string().optional(),
  },
  nodes: [
    node({
      name: "endpoint",
      sql: `
        SELECT
          multiIf(
            {{String(granularity, 'day')}} = 'month', toStartOfMonth(${USER_EVENT_DAY_SQL}),
            {{String(granularity, 'day')}} = 'week', toMonday(${USER_EVENT_DAY_SQL}),
            ${USER_EVENT_DAY_SQL}
          ) AS period,
          uniqExact(identity_id) AS active,
          uniqExactIf(identity_id, properties['pro'] = 'true') AS pro_active,
          ${ACTIVITY_COUNT_SQL}
        FROM user_events
        WHERE 1
          {% if defined(date_from) %}
            AND ${USER_EVENT_DAY_SQL} >= toDate({{String(date_from)}})
          {% end %}
          {% if defined(date_to) %}
            AND ${USER_EVENT_DAY_SQL} <= toDate({{String(date_to)}})
          {% end %}
        GROUP BY period
        ORDER BY period ASC
      `,
    }),
  ],
  output: {
    period: t.date(),
    active: t.uint64(),
    pro_active: t.uint64(),
    ...ACTIVITY_COUNT_OUTPUT,
  },
});

export type ActiveUsersTimeseriesParams = InferParams<
  typeof activeUsersTimeseries
>;
export type ActiveUsersTimeseriesOutput = InferOutputRow<
  typeof activeUsersTimeseries
>;

/**
 * active_users_windows – distinct identities and activity counts over the last
 * 1, 7 and 30 calendar days (UTC, including today), one row per window.
 */
export const activeUsersWindows = defineEndpoint("active_users_windows", {
  description: "Distinct active identities over the last 1/7/30 calendar days",
  tokens: [PROD_TOKEN_READ],
  params: {},
  nodes: [
    node({
      name: "endpoint",
      sql: `
        SELECT
          window_days,
          uniqExact(identity_id) AS active,
          uniqExactIf(identity_id, properties['pro'] = 'true') AS pro_active,
          ${ACTIVITY_COUNT_SQL}
        FROM user_events
        ARRAY JOIN [1, 7, 30] AS window_days
        WHERE ${USER_EVENT_DAY_SQL} > today() - window_days
        GROUP BY window_days
        ORDER BY window_days ASC
      `,
    }),
  ],
  output: {
    window_days: t.uint8(),
    active: t.uint64(),
    pro_active: t.uint64(),
    ...ACTIVITY_COUNT_OUTPUT,
  },
});

export type ActiveUsersWindowsOutput = InferOutputRow<
  typeof activeUsersWindows
>;

/**
 * user_events_list – raw rows for one event name, newest first, for the
 * admin dashboard's per-metric event table. `before` (Unix millis) pages
 * backwards from the previous page's oldest row.
 */
export const userEventsList = defineEndpoint("user_events_list", {
  description: "Raw user events for one event name, newest first",
  tokens: [PROD_TOKEN_READ],
  params: {
    event: p.string(),
    date_from: p.string().optional(),
    date_to: p.string().optional(),
    property_key: p.string().optional(),
    property_value: p.string().optional(),
    before: p.int64().optional(),
    limit: p.int32().optional(50),
  },
  nodes: [
    node({
      name: "endpoint",
      sql: `
        SELECT
          timestamp,
          identity_id,
          did,
          event,
          toJSONString(properties) AS properties_json
        FROM user_events
        WHERE event = {{String(event)}}
          {% if defined(date_from) %}
            AND ${USER_EVENT_DAY_SQL} >= toDate({{String(date_from)}})
          {% end %}
          {% if defined(date_to) %}
            AND ${USER_EVENT_DAY_SQL} <= toDate({{String(date_to)}})
          {% end %}
          {% if defined(property_key) %}
            AND properties[{{String(property_key)}}] = {{String(property_value, '')}}
          {% end %}
          {% if defined(before) %}
            AND timestamp < {{Int64(before)}}
          {% end %}
        ORDER BY timestamp DESC
        LIMIT {{Int32(limit, 50)}}
      `,
    }),
  ],
  output: {
    timestamp: t.uint64(),
    identity_id: t.string(),
    did: t.string(),
    event: t.string(),
    // JSON-encoded Map(String, String). Not aliased to `properties`: a
    // same-named alias would shadow the map column in the WHERE clause.
    properties_json: t.string(),
  },
});

export type UserEventsListOutput = InferOutputRow<typeof userEventsList>;

// ============================================================================
// Client
// ============================================================================

export const tinybird = new Tinybird({
  datasources: { analyticsEvents, subscriptionEvents, userEvents },
  pipes: {
    publicationTraffic,
    publicationTopReferrers,
    publicationTopPages,
    publicationBskyTraffic,
    activeUsersTimeseries,
    activeUsersWindows,
    userEventsList,
  },
  devMode: false,
});
