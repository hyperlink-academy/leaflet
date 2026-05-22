"use client";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { PermissionToken } from "src/replicache";
import { useIdentityData } from "components/IdentityProvider";
import { Leaflet, LeafletList } from "../home/HomeLayout";
import { CreateNewLeafletButton } from "../home/Actions/CreateNewButton";

export const LooseleafsContent = (props: {
  entityID: string | null;
  titles: { [root_entity: string]: string };
}) => {
  let [searchValue, setSearchValue] = useState("");
  let [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  useDebouncedEffect(
    () => {
      setDebouncedSearchValue(searchValue);
    },
    200,
    [searchValue],
  );

  return (
    <DashboardPageLayout
      scrollKey="dashboard-looseleafs-home"
      pageTitle="Looseleafs"
      mobileActions={<CreateNewLeafletButton compact />}
      showHeader={false}
    >
      <LooseleafList
        titles={props.titles}
        searchValue={debouncedSearchValue}
      />
    </DashboardPageLayout>
  );
};

export const LooseleafList = (props: {
  titles: { [root_entity: string]: string };
  searchValue: string;
}) => {
  let { identity } = useIdentityData();

  let leaflets: Leaflet[] = identity
    ? identity.permission_token_on_homepage
        .filter(
          (ptoh) => ptoh.permission_tokens.leaflets_to_documents.length > 0,
        )
        .map((ptoh) => ({
          added_at: ptoh.created_at,
          token: ptoh.permission_tokens as PermissionToken,
        }))
    : [];
  return (
    <LeafletList
      defaultDisplay="list"
      searchValue={props.searchValue}
      leaflets={leaflets}
      titles={props.titles}
      showPreview
    />
  );
};
