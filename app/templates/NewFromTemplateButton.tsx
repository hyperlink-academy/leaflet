"use client";

import { createNewLeafletFromTemplate } from "actions/createNewLeafletFromTemplate";
import { ButtonPrimary } from "components/Buttons";
import { AddTiny } from "components/Icons";

export function NewFromTemplateButton(props: { templateID: string }) {
  return (
    <ButtonPrimary
      className="!w-fit !border-2 !border-white hover:!outline-none hover:scale-105 hover:-rotate-2 transition-all"
      onClick={async () => {
        let id = await createNewLeafletFromTemplate(props.templateID, false);
        window.open(`/${id}`, "_blank");
      }}
    >
      Create
      <AddTiny />
    </ButtonPrimary>
  );
}
