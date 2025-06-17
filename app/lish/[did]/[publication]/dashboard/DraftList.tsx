"use client";

import Link from "next/link";
import { NewDraftSecondaryButton } from "./NewDraftButton";
import React, { useState } from "react";
import { usePublicationData } from "./PublicationSWRProvider";
import { Menu, MenuItem } from "components/Layout";
import { MoreOptionsTiny } from "components/Icons/MoreOptionsTiny";
import { deleteDraft } from "./deleteDraft";

export function DraftList() {
  let { data: pub_data } = usePublicationData();
  if (!pub_data) return null;
  return (
    <div className="flex flex-col gap-4 pb-8 sm:pb-12">
      <NewDraftSecondaryButton fullWidth publication={pub_data?.uri} />
      {pub_data.leaflets_in_publications
        .filter((d) => !d.doc)
        .map((d) => {
          return (
            <React.Fragment key={d.leaflet}>
              <Draft id={d.leaflet} {...d} />
              <hr className="last:hidden border-border-light" />
            </React.Fragment>
          );
        })}
    </div>
  );
}

function Draft(props: { id: string; title: string; description: string }) {
  let [open, setOpen] = useState(false);
  return (
    <div className="flex flex-row gap-2 items-start">
      <Link
        key={props.id}
        href={`/${props.id}`}
        className="flex flex-col gap-0 hover:!no-underline grow"
      >
        {props.title ? (
          <h3 className="text-primary">{props.title}</h3>
        ) : (
          <h3 className="text-tertiary italic">Untitled</h3>
        )}
        <div className="text-secondary italic">{props.description}</div>
      </Link>
      <Menu
        open={open}
        onOpenChange={(o) => setOpen(o)}
        align="end"
        asChild
        trigger={
          <button className="text-secondary hover:accent-primary border border-accent-2 rounded-md h-min w-min pt-2.5">
            <MoreOptionsTiny className="rotate-90 h-min w-min " />
          </button>
        }
      >
        <>
          <DeleteDraft id={props.id} />
        </>
      </Menu>
    </div>
  );
}

export function DeleteDraft(props: { id: string }) {
  let { mutate } = usePublicationData();
  let [state, setState] = useState<"normal" | "confirm">("normal");

  return (
    <MenuItem
      onSelect={async (e) => {
        if (state === "normal") {
          e.preventDefault();
          return setState("confirm");
        }
        await mutate((data) => {
          if (!data) return data;
          return {
            ...data,
            leaflets_in_publications: data.leaflets_in_publications.filter(
              (d) => d.leaflet !== props.id,
            ),
          };
        }, false);
        await deleteDraft(props.id);
      }}
    >
      {state === "normal" ? "Delete Draft" : "Are you sure?"}
    </MenuItem>
  );
}
