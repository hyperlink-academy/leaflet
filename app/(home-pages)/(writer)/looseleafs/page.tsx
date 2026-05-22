import { getIdentityData } from "actions/getIdentityData";
import { LooseleafsContent } from "./LooseleafsLayout";

export default async function Home() {
  let auth_res = await getIdentityData();

  let titles =
    auth_res?.permission_token_on_homepage.reduce(
      (acc, tok) => {
        let title =
          tok.permission_tokens.leaflets_in_publications[0]?.title ||
          tok.permission_tokens.leaflets_to_documents[0]?.title ||
          tok.permission_tokens.title ||
          undefined;
        if (title) acc[tok.permission_tokens.root_entity] = title;
        return acc;
      },
      {} as { [k: string]: string },
    ) ?? {};

  return (
    <LooseleafsContent
      entityID={auth_res?.home_leaflet?.root_entity || null}
      titles={titles}
    />
  );
}
