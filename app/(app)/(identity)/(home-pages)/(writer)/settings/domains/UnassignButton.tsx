"use client";
import { useState } from "react";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { UnlinkTiny } from "components/Icons/UnlinkTiny";
import { Modal } from "components/Modal";

export function UnassignButton(props: {
  onUnassign: () => void;
  domain: string;
  linkedItem: string | undefined;
}) {
  let [open, setOpen] = useState(false);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Are You Sure?"
      className="text-center max-w-sm "
      trigger={
        <div className="text-secondary hover:text-accent-contrast text-sm">
          <UnlinkTiny />
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col ">
          <p className="text-accent-contrast min-w-0 truncate">
            {props.domain}
          </p>{" "}
          will no longer link to{" "}
          <p className="font-bold line-clamp-2 light-container py-1 mt-0.5">
            {props.linkedItem}
          </p>
        </div>
        <p> You can always re-assign this domain to something else later.</p>
        <div className="flex gap-2 items-center justify-center pt-2">
          <ButtonTertiary type="button" onClick={() => setOpen(false)}>
            Nevermind
          </ButtonTertiary>
          <ButtonPrimary
            type="button"
            onClick={() => {
              setOpen(false);
              props.onUnassign();
            }}
          >
            Confirm
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
}
