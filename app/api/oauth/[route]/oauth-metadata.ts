import {
  OAuthClientMetadata,
  OAuthClientMetadataInput,
} from "@atproto/oauth-client-node";
const hostname =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://leaflet.pub";

const scope =
  "atproto transition:generic transition:email include:pub.leaflet.authFullPermissions include:site.standard.authFull include:app.bsky.authCreatePosts include:app.bsky.authViewAll?aud=did:web:api.bsky.app%23bsky_appview blob:*/*";
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
export const oauth_metadata =
  process.env.NODE_ENV === "development" ? localconfig : prodconfig;
