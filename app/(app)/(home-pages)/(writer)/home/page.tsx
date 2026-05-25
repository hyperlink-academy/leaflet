import { getIdentityData } from "actions/getIdentityData";

import { HomeContent } from "./HomeLayout";

export default async function Home() {
  let auth_res = await getIdentityData();

  let titles: { [k: string]: string } =
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

  // Include titles for drafts the user is a contributor on
  for (let row of auth_res?.contributor_leaflets ?? []) {
    let pt = row.permission_tokens;
    let title =
      pt.leaflets_in_publications?.[0]?.title ||
      pt.leaflets_to_documents?.[0]?.title ||
      pt.title ||
      undefined;
    if (title) titles[pt.root_entity] = title;
  }

  return (
    <HomeContent
      titles={titles}
      entityID={auth_res?.home_leaflet?.root_entity || null}
    />
  );
}
