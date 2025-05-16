"use client";

import Link from "next/link";
import { NewDraftSecondaryButton } from "./NewDraftButton";
import React from "react";
import { usePublicationData } from "./PublicationSWRProvider";

export function DraftList() {
  let pub_data = usePublicationData();
  console.log({ pub_data });
  if (!pub_data) return null;
  return (
    <div className="flex flex-col gap-4 pb-6">
      <NewDraftSecondaryButton fullWidth publication={pub_data?.name} />
      {pub_data.leaflets_in_publications.map((d) => {
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
    </div>
  );
}
