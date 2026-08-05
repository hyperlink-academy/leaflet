"use client";
import { useState } from "react";
import { deleteDomain } from "actions/domains";
import {
  useIdentityData,
  mutateIdentityData,
} from "components/IdentityProvider";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { DeleteTiny } from "components/Icons/DeleteTiny";
import { Modal } from "components/Modal";

export function DeleteDomainButton(props: { domain: string }) {
  let { mutate: mutateIdentity } = useIdentityData();
  let [open, setOpen] = useState(false);
  let [loading, setLoading] = useState(false);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Are You Sure?"
      className="max-w-sm text-center"
      trigger={
        <DeleteTiny className="text-secondary hover:text-accent-contrast shrink-0" />
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-secondary">
          Deleting <strong>{props.domain}</strong> will remove all current
          assignments.
        </p>
        <p>
          It will not be available to assign later. You will have to re-verify
          it.
        </p>
        <div className="flex gap-2 items-center justify-center ">
          <ButtonTertiary
            className="text-accent-contrast font-bold"
            type="button"
            onClick={() => setOpen(false)}
          >
            Cancel
          </ButtonTertiary>
          <ButtonPrimary
            compact
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              mutateIdentityData(mutateIdentity, (draft) => {
                draft.custom_domains = draft.custom_domains.filter(
                  (d) => d.domain !== props.domain,
                );
              });
              setOpen(false);
              await deleteDomain({ domain: props.domain });
            }}
          >
            {loading ? <DotLoader /> : "Delete"}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
}
