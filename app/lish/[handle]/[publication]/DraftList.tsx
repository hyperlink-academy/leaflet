"use client";

import { Fact, ReplicacheProvider } from "src/replicache";
import { usePublicationRelationship } from "./usePublicationRelationship";
import { usePublicationContext } from "components/Providers/PublicationContext";
import Link from "next/link";
import { NewDraftSecondaryButton } from "./NewDraftButton";

export function DraftList(props: {
  publication: string;
  drafts: {
    leaflet: string;
    description: string;
    title: string;
  }[];
}) {
  let rel = usePublicationRelationship();
  let { publication } = usePublicationContext();
  if (!publication) return null;
  if (!rel?.isAuthor) return null;
  return (
    <div className="flex flex-col gap-2">
      <NewDraftSecondaryButton publication={props.publication} />
      {props.drafts.map((d) => {
        return <Draft id={d.leaflet} key={d.leaflet} {...d} />;
      })}
    </div>
  );
}

function Draft(props: { id: string; title: string }) {
  return (
    <Link key={props.id} href={`/${props.id}`}>
      <h3>{props.title}</h3>
    </Link>
  );
}
