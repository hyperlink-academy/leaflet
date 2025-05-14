"use client";

import { Fact, ReplicacheProvider } from "src/replicache";
import { usePublicationRelationship } from "./usePublicationRelationship";
import { usePublicationContext } from "components/Providers/PublicationContext";
import Link from "next/link";
import { NewDraftSecondaryButton } from "./NewDraftButton";

export function DraftList(props: {
  publication: string;
  drafts: { id: string; initialFacts: Fact<any>[]; root_entity: string }[];
}) {
  let rel = usePublicationRelationship();
  let { publication } = usePublicationContext();
  if (!publication) return null;
  if (!rel?.isAuthor) return null;
  return (
    <div className="flex flex-col gap-2">
      <NewDraftSecondaryButton publication={props.publication} />
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
