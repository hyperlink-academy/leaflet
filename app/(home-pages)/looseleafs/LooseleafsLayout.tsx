"use client";
import {
  DashboardLayout,
  PublicationDashboardControls,
} from "components/PageLayouts/DashboardLayout";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { Fact, PermissionToken } from "src/replicache";
import { Attribute } from "src/replicache/attributes";
import { Actions } from "../home/Actions/Actions";
import { callRPC } from "app/api/rpc/client";
import { useIdentityData } from "components/IdentityProvider";
import useSWR from "swr";
import { getHomeDocs } from "../home/storage";
import { Leaflet, LeafletList } from "../home/HomeLayout";
import { EmptyState } from "components/EmptyState";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";

export const LooseleafsLayout = (props: {
  entityID: string | null;
  titles: { [root_entity: string]: string };
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
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

  let cardBorderHidden = !!useCardBorderHidden(props.entityID);
  return (
    <DashboardLayout
      id="looseleafs"
      cardBorderHidden={cardBorderHidden}
      currentPage="looseleafs"
      defaultTab="Drafts"
      actions={<Actions />}
      tabs={{
        Drafts: {
          controls: (
            <PublicationDashboardControls
              defaultDisplay={"list"}
              hasBackgroundImage={cardBorderHidden}
              searchValue={searchValue}
              setSearchValueAction={setSearchValue}
            />
          ),
          content: <LooseleafDraftList empty={true} />,
        },
        Published: {
          controls: null,
          content: (
            <LooseleafList
              titles={props.titles}
              initialFacts={props.initialFacts}
              cardBorderHidden={cardBorderHidden}
              searchValue={debouncedSearchValue}
            />
          ),
        },
      }}
    />
  );
};

const LooseleafDraftList = (props: { empty: boolean }) => {
  if (props.empty)
    return (
      <EmptyState className="pt-2">
        <div className="italic">You don't have any looseleaf drafts yet…</div>
        <ButtonPrimary className="mx-auto">New Draft</ButtonPrimary>
      </EmptyState>
    );
  return (
    <div className="flex flex-col">
      <ButtonSecondary fullWidth>New Looseleaf Draft</ButtonSecondary>
      This is where the draft would go if we had them lol
    </div>
  );
};

export const LooseleafList = (props: {
  titles: { [root_entity: string]: string };
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
  searchValue: string;
  cardBorderHidden: boolean;
}) => {
  let { identity } = useIdentityData();
  let { data: initialFacts } = useSWR(
    "home-leaflet-data",
    async () => {
      if (identity) {
        let { result } = await callRPC("getFactsFromHomeLeaflets", {
          tokens: identity.permission_token_on_homepage.map(
            (ptrh) => ptrh.permission_tokens.root_entity,
          ),
        });
        let titles = {
          ...result.titles,
          ...identity.permission_token_on_homepage.reduce(
            (acc, tok) => {
              let title =
                tok.permission_tokens.leaflets_in_publications[0]?.title ||
                tok.permission_tokens.leaflets_to_documents[0]?.title;
              if (title) acc[tok.permission_tokens.root_entity] = title;
              return acc;
            },
            {} as { [k: string]: string },
          ),
        };
        return { ...result, titles };
      }
    },
    { fallbackData: { facts: props.initialFacts, titles: props.titles } },
  );

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

  if (!leaflets || leaflets.length === 0)
    return (
      <EmptyState>
        <div className="italic">You haven't published any looseleafs yet.</div>
        <ButtonPrimary className="mx-auto">
          Start a Looseleaf Draft
        </ButtonPrimary>
      </EmptyState>
    );

  return (
    <LeafletList
      defaultDisplay="list"
      searchValue={props.searchValue}
      leaflets={leaflets}
      titles={initialFacts?.titles || {}}
      cardBorderHidden={props.cardBorderHidden}
      initialFacts={initialFacts?.facts || {}}
      showPreview
    />
  );
};
