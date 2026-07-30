import {
  OAuthClientMetadata,
  OAuthClientMetadataInput,
} from "@atproto/oauth-client-node";
import { isProductionDomain } from "src/utils/isProductionDeployment";

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

// The branch URL (stable across pushes to a branch) rather than the per-deploy
// URL, so the client identity — and any sessions bound to it — survive
// redeploys. Always open previews via the branch alias: the callback lands on
// this host and the auth cookie is host-only outside production.
const preview_host = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;

// atproto requires client_id to be the publicly fetchable URL of this metadata
// document, with redirect_uris on the same origin — so previews must identify
// as their own host. A public client (token_endpoint_auth_method: none) skips
// jwks/private-key provisioning; previews don't need long-lived tokens.
const previewconfig: OAuthClientMetadataInput = {
  client_id: `https://${preview_host}/api/oauth/metadata`,
  client_name: `Leaflet (preview)`,
  client_uri: `https://${preview_host}`,
  redirect_uris: [`https://${preview_host}/api/oauth/callback`],
  grant_types: [`authorization_code`, `refresh_token`],
  response_types: [`code`],
  application_type: `web`,
  scope,
  token_endpoint_auth_method: `none`,
  dpop_bound_access_tokens: true,
};

// The !preview_host arm keeps a production build run outside Vercel (e.g.
// `next build && next start` locally) on the prod client instead of a
// `https://undefined` one.
export const oauth_metadata =
  process.env.NODE_ENV === "development"
    ? localconfig
    : isProductionDomain() || !preview_host
      ? prodconfig
      : previewconfig;

// Rows in oauth_state_store/oauth_session_store are shared by every deployment
// pointing at the same database, but a saved session is only usable by the
// client (client_id + DPoP keys) that created it — an unprefixed write from dev
// or a preview would overwrite and break the production session saved under
// the same DID. Namespace keys by client host; production stays unprefixed so
// existing rows remain valid.
export const oauth_store_key_prefix =
  oauth_metadata === prodconfig
    ? ""
    : `${new URL(oauth_metadata.client_id!).host}:`;
