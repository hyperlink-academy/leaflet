import { JoseKey } from "@atproto/jwk-jose";
(async () => {
  let key = await JoseKey.generate();
  console.log(JSON.stringify(key.privateJwk));
})();
