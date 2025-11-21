"use client";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { useState } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { Fact } from "src/replicache";
import { Attribute } from "src/replicache/attributes";
import { Actions } from "../home/Actions/Actions";

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
      defaultTab="home"
      actions={<Actions />}
      tabs={{
        home: {
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

export const LooseleafList = (props: {
  titles: { [root_entity: string]: string };
  initialFacts: {
    [root_entity: string]: Fact<Attribute>[];
  };
  searchValue: string;
  cardBorderHidden: boolean;
}) => {
  return <div>hello</div>;
};
