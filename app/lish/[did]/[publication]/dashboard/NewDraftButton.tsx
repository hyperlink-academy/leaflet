"use client";
import { createPublicationDraft } from "actions/createPublicationDraft";
import { ActionButton } from "components/ActionBar/ActionButton";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { AddTiny } from "components/Icons/AddTiny";
import { useRouter } from "next/navigation";

export function NewDraftActionButton(props: {
  publication: string;
  compact?: boolean;
}) {
  let router = useRouter();

  async function handleOnClick() {
    let newLeaflet = await createPublicationDraft(props.publication);
    router.push(`/${newLeaflet}`);
  }

  if (props.compact)
    return (
      <ButtonPrimary compact className="text-sm!" onClick={handleOnClick}>
        <AddTiny className="scale-90" /> Draft
      </ButtonPrimary>
    );
  return (
    <ActionButton
      id="new-leaflet-button"
      primary
      onClick={handleOnClick}
      icon=<AddTiny className="m-1" />
      className="w-full"
      label="Draft"
    />
  );
}
