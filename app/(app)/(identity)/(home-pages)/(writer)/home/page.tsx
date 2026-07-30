import { getIdentityData } from "actions/getIdentityData";
import { getHomeLeaflet } from "src/homeLeaflet";

import { HomeContent } from "./HomeLayout";

export default async function Home() {
  let [auth_res, home_leaflet] = await Promise.all([
    getIdentityData(),
    getHomeLeaflet(),
  ]);

  let titleOf = (pt: {
    leaflets_in_publications?: { title: string | null }[] | null;
    leaflets_to_documents?: { title: string | null }[] | null;
    title?: string | null;
  }) =>
    pt.leaflets_in_publications?.[0]?.title ||
    pt.leaflets_to_documents?.[0]?.title ||
    pt.title ||
    undefined;

  let titles: { [k: string]: string } = {};
  for (let tok of auth_res?.permission_token_on_homepage ?? []) {
    let title = titleOf(tok.permission_tokens);
    if (title) titles[tok.permission_tokens.root_entity] = title;
  }

  // Include titles for drafts the user is a contributor on
  for (let row of auth_res?.contributor_leaflets ?? []) {
    let title = titleOf(row.permission_tokens);
    if (title) titles[row.permission_tokens.root_entity] = title;
  }

  return (
    <HomeContent
      titles={titles}
      entityID={home_leaflet?.root_entity || null}
    />
  );
}
