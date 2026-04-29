"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Modal } from "components/Modal";
import { DotLoader } from "components/utils/DotLoader";

export const LinkIdentityModal = (props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedInAs: string;
  linkingIdentity: string;
  confirmButtonLabel: string;
  onConfirm: () => void | Promise<void>;
  confirming?: boolean;
}) => {
  let router = useRouter();
  let [loggingOut, setLoggingOut] = useState(false);

  return (
    <Modal
      open={props.open}
      onOpenChange={(o) => {
        if (loggingOut || props.confirming) return;
        props.onOpenChange(o);
      }}
      className="w-[400px] max-w-full"
    >
      <div className="flex flex-col gap-3">
        <h3 className="text-primary leading-tight">
          You're signed in as{" "}
          <span className="font-bold">{props.signedInAs}</span>
        </h3>
        <p className="text-secondary leading-snug">
          Do you want to link{" "}
          <span className="font-bold">{props.linkingIdentity}</span> to this
          account?
        </p>
        <div className="flex flex-wrap gap-2 justify-end pt-1">
          <ButtonSecondary
            disabled={loggingOut || props.confirming}
            onClick={async () => {
              if (loggingOut) return;
              setLoggingOut(true);
              try {
                await fetch("/api/auth/logout");
              } finally {
                mutate("identity", null);
                router.refresh();
              }
            }}
          >
            {loggingOut ? <DotLoader /> : "Log out"}
          </ButtonSecondary>
          <ButtonPrimary
            disabled={loggingOut || props.confirming}
            onClick={() => {
              if (props.confirming) return;
              void props.onConfirm();
            }}
          >
            {props.confirming ? <DotLoader /> : props.confirmButtonLabel}
          </ButtonPrimary>
        </div>
      </div>
    </Modal>
  );
};
