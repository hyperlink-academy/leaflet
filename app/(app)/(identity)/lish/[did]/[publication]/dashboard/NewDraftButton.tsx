"use client";
import { createPublicationDraft } from "actions/createPublicationDraft";
import { ActionButton } from "components/ActionBar/ActionButton";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { AddTiny } from "components/Icons/AddTiny";
import { useRouter } from "next/navigation";

function useCreateDraft(publication: string) {
  let router = useRouter();
  return async () => {
    let newLeaflet = await createPublicationDraft(publication);
    router.push(`/${newLeaflet}`);
  };
}

export function NewDraftButton(props: {
  publication: string;
  type?: "primary" | "secondary" | "tertiary";
  children: React.ReactNode;
}) {
  let handleOnClick = useCreateDraft(props.publication);
  let Button = {
    primary: ButtonPrimary,
    secondary: ButtonSecondary,
    tertiary: ButtonTertiary,
  }[props.type ?? "primary"];
  return <Button onClick={handleOnClick}>{props.children}</Button>;
}

export function NewDraftActionButton(props: {
  publication: string;
  compact?: boolean;
}) {
  let handleOnClick = useCreateDraft(props.publication);

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
