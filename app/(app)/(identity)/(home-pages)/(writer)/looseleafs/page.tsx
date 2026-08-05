import { getIdentityData } from "actions/getIdentityData";
import { getHomeLeaflet } from "src/homeLeaflet";
import { getLeafletTitle } from "src/utils/getLeafletTitle";
import { LooseleafsContent } from "./LooseleafsLayout";

export default async function Home() {
  let [auth_res, home_leaflet] = await Promise.all([
    getIdentityData(),
    getHomeLeaflet(),
  ]);

  let titles =
    auth_res?.permission_token_on_homepage.reduce(
      (acc, tok) => {
        let title = getLeafletTitle(tok.permission_tokens);
        if (title) acc[tok.permission_tokens.root_entity] = title;
        return acc;
      },
      {} as { [k: string]: string },
    ) ?? {};

  return (
    <LooseleafsContent
      entityID={home_leaflet?.root_entity || null}
      titles={titles}
    />
  );
}
