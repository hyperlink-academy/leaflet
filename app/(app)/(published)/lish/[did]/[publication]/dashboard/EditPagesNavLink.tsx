"use client";
import { ActionButton } from "components/ActionBar/ActionButton";
import { PaintSmall } from "components/Icons/PaintSmall";
import { useRouter } from "next/navigation";

export function EditPagesNavLink(props: {
  publication: string;
  did: string;
  publicationName: string;
}) {
  let router = useRouter();

  return (
    <ActionButton
      id="edit-pages-button"
      icon={<PaintSmall />}
      label="Customize"
      onClick={() =>
        // The editor creates the publication's draft leaflet on first visit.
        router.push(`/lish/${props.did}/${props.publicationName}/edit`)
      }
      className="w-full"
    />
  );
}
