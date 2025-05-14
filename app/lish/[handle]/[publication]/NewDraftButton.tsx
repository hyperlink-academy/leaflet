"use client";
import { createPublicationDraft } from "actions/createPublicationDraft";
import { ActionButton } from "components/ActionBar/ActionButton";
import { ButtonSecondary } from "components/Buttons";
import { AddTiny } from "components/Icons/AddTiny";
import { useRouter } from "next/navigation";

export function NewDraftActionButton(props: { publication: string }) {
  let router = useRouter();

  return (
    <ActionButton
      id="new-leaflet-button"
      primary
      onClick={async () => {
        let newLeaflet = await createPublicationDraft(props.publication);
        router.push(`/${newLeaflet}`);
      }}
      icon=<AddTiny className="m-1 shrink-0" />
      label="New Draft"
    />
  );
}

export function NewDraftSecondaryButton(props: { publication: string }) {
  let router = useRouter();

  return (
    <ButtonSecondary
      fullWidth
      id="new-leaflet-button"
      onClick={async () => {
        let newLeaflet = await createPublicationDraft(props.publication);
        router.push(`/${newLeaflet}`);
      }}
    >
      <AddTiny className="m-1 shrink-0" />
      <span>New Post</span>
    </ButtonSecondary>
  );
}
