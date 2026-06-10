"use client";
import { ActionButton } from "components/ActionBar/ActionButton";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { useRouter } from "next/navigation";
import { useHasEntitlement } from "src/hooks/useEntitlement";

export function EditPagesNavLink(props: {
  publication: string;
  did: string;
  publicationName: string;
}) {
  let router = useRouter();
  let editPubPagesEnabled = useHasEntitlement("edit-pub-pages");

  if (!editPubPagesEnabled) return null;

  return (
    <ActionButton
      id="edit-pages-button"
      icon={<BlockDocPageSmall />}
      label="Edit Pages"
      onClick={() =>
        // The editor creates the publication's draft leaflet on first visit.
        router.push(`/lish/${props.did}/${props.publicationName}/edit`)
      }
      className="w-full"
    />
  );
}
