import {
  OAuthClientMetadata,
  OAuthClientMetadataInput,
} from "@atproto/oauth-client-node";
const hostname =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://leaflet.pub";

const scope =
  "atproto transition:email account:email?action=read include:pub.leaflet.authFullPermissions include:site.standard.authFull include:app.bsky.authCreatePosts include:app.bsky.authViewAll?aud=did:web:api.bsky.app%23bsky_appview rpc:parts.page.mention.search?aud=* blob:*/*";
const localconfig: OAuthClientMetadataInput = {
  client_id: `http://localhost/?redirect_uri=${encodeURI(`http://127.0.0.1:3000/api/oauth/callback`)}&scope=${encodeURIComponent(scope)}`,
  client_name: `Leaflet`,
  client_uri: hostname,
  redirect_uris: [`http://127.0.0.1:3000/api/oauth/callback`],
  grant_types: [`authorization_code`, `refresh_token`],
  response_types: [`code`],
  application_type: `web`,
  scope,
  token_endpoint_auth_method: `none`,
  dpop_bound_access_tokens: true,
};

// Vercel preview deployments use this config too, deliberately: atproto
// requires the client_id metadata document to be publicly fetchable, which
// deployment protection blocks. Instead previews act as the production client —
// the PDS round-trip completes on leaflet.pub, which hands the session back to
// the preview host via postAuthRedirect's encrypted cross-site handoff (the
// custom-domain flow). This needs JOSE_PRIVATE_KEY_1, CROSS_SITE_AUTH_SECRET,
// and REDIS_URL set in Vercel's Preview environment: the key to sign PARs and
// refresh tokens, and the Redis request lock because preview and production
// refresh the same session rows.
const prodconfig: OAuthClientMetadataInput = {
  client_id: `${hostname}/api/oauth/metadata`,
  client_name: `Leaflet`,
  client_uri: hostname,
  logo_uri: `${hostname}/logo.png`,
  tos_uri: `${hostname}/legal?terms`,
  policy_uri: `${hostname}/legal?privacy`,
  redirect_uris:
    process.env.NODE_ENV === "development"
      ? [`http://127.0.0.1:3000/api/oauth/callback`]
      : [`https://leaflet.pub/api/oauth/callback`],
  grant_types: [`authorization_code`, `refresh_token`],
  response_types: [`code`],
  application_type: `web`,
  scope,
  token_endpoint_auth_method: `private_key_jwt`,
  token_endpoint_auth_signing_alg: "ES256",
  dpop_bound_access_tokens: true,
  jwks_uri: `${hostname}/api/oauth/jwks`,
};
export const oauth_metadata =
  process.env.NODE_ENV === "development" ? localconfig : prodconfig;

// Rows in oauth_state_store/oauth_session_store are shared by every deployment
// pointing at the same database, but a saved session is only usable by the
// client (client_id + DPoP keys) that created it — an unprefixed write from
// local dev would overwrite and break the production session saved under the
// same DID. Namespace keys by client host; the production client (which
// previews share, so their state/session rows interoperate with leaflet.pub's)
// stays unprefixed so existing rows remain valid.
export const oauth_store_key_prefix =
  oauth_metadata === prodconfig
    ? ""
    : `${new URL(oauth_metadata.client_id!).host}:`;
