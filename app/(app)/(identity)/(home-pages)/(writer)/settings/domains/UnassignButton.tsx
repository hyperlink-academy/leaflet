"use client";
import { useState } from "react";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { UnlinkTiny } from "components/Icons/UnlinkTiny";
import { Modal } from "components/Modal";

type UnassignProps = {
  onUnassign: () => void;
  domain: string;
  linkedItem: string | undefined;
};

export function UnassignButton(props: UnassignProps) {
  let [open, setOpen] = useState(false);

  return (
    <UnassignModal
      {...props}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <div className="text-secondary hover:text-accent-contrast text-sm">
          <UnlinkTiny />
        </div>
      }
    />
  );
}

export function UnassignModal(
  props: UnassignProps & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger?: React.ReactNode;
  },
) {
  let setOpen = props.onOpenChange;
  return (
    <Modal
      open={props.open}
      onOpenChange={setOpen}
      title="Are You Sure?"
      className="text-center max-w-sm "
      trigger={props.trigger}
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
