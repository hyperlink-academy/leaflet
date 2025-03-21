"use client";
import { createPublicationDraft } from "actions/createPublicationDraft";
import { ButtonPrimary } from "components/Buttons";
import { useRouter } from "next/navigation";

export function NewDraftButton(props: { publication: string }) {
  let router = useRouter();
  return (
    <div className="flex gap-2">
      <ButtonPrimary
        onClick={async () => {
          let newLeaflet = await createPublicationDraft(props.publication);
          router.push(`/${newLeaflet}`);
        }}
      >
        New Draft
      </ButtonPrimary>
    </div>
  );
}
