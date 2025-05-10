"use client";

import { Fact, ReplicacheProvider } from "src/replicache";
import { usePublicationRelationship } from "./usePublicationRelationship";
import { usePublicationContext } from "components/Providers/PublicationContext";
import Link from "next/link";

export function DraftList(props: {
  drafts: { id: string; initialFacts: Fact<any>[]; root_entity: string }[];
}) {
  let rel = usePublicationRelationship();
  let { publication } = usePublicationContext();
  if (!publication) return null;
  if (!rel?.isAuthor) return null;
  return (
    <div className="">
      <h2>drafts</h2>
      {props.drafts.map((d) => {
        return (
          <ReplicacheProvider
            key={d.id}
            rootEntity={d.root_entity}
            initialFacts={d.initialFacts}
            token={{
              ...d,
              permission_token_rights: [],
            }}
            name={d.id}
          >
            <Draft id={d.id} />
          </ReplicacheProvider>
        );
      })}
    </div>
  );
}

function Draft(props: { id: string }) {
  return (
    <Link key={props.id} href={`/${props.id}`}>
      {props.id}
    </Link>
  );
}
