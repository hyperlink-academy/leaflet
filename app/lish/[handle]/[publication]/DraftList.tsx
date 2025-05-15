"use client";

import { Fact, ReplicacheProvider } from "src/replicache";
import { usePublicationRelationship } from "./usePublicationRelationship";
import { usePublicationContext } from "components/Providers/PublicationContext";
import Link from "next/link";
import { NewDraftSecondaryButton } from "./NewDraftButton";
import { MoreOptionsTiny } from "components/Icons/MoreOptionsTiny";
import { Menu, MenuItem } from "components/Layout";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { DeleteSmall } from "components/Icons/DeleteSmall";

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
    <div className="flex flex-col gap-4">
      <NewDraftSecondaryButton fullWidth publication={props.publication} />
      {props.drafts.map((d) => {
        return (
          <>
            <Draft id={d.leaflet} key={d.leaflet} {...d} />
            <hr className="last:hidden border-border-light" />
          </>
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
      <DraftOptionsMenu />
    </div>
  );
}

const DraftOptionsMenu = () => {
  return (
    <Menu trigger={<MoreOptionsVerticalTiny />}>
      <MenuItem onSelect={() => {}}>
        <DeleteSmall /> Delete Draft
      </MenuItem>
    </Menu>
  );
};
