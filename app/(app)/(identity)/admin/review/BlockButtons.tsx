"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import {
  blockAccount,
  blockSite,
  unblockAccount,
} from "actions/admin/reviewBlock";

function useBlockAction() {
  let toaster = useToaster();
  let router = useRouter();
  let [busy, setBusy] = useState(false);
  let run = async (
    action: () => ReturnType<typeof blockAccount>,
    done: (count: number) => string,
  ) => {
    if (busy) return;
    setBusy(true);
    let res = await action();
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: res.error });
      return;
    }
    toaster({ type: "success", content: done(res.value) });
    router.refresh();
  };
  return { busy, run };
}

// Two clicks: blocking takes an account's pages down and stops it publishing.
export function BlockSiteButton(props: { domain: string; accounts: number }) {
  let { busy, run } = useBlockAction();
  let [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <ButtonSecondary compact onClick={() => setConfirming(true)}>
        Block
      </ButtonSecondary>
    );
  return (
    <ButtonPrimary
      compact
      disabled={busy}
      onClick={() =>
        run(
          () => blockSite({ domain: props.domain }),
          (n) => `Blocked ${n} accounts devoted to ${props.domain}`,
        )
      }
    >
      {busy ? <DotLoader /> : `Block ${props.accounts} accounts`}
    </ButtonPrimary>
  );
}

export function BlockAccountButton(props: { did: string; blocked: boolean }) {
  let { busy, run } = useBlockAction();
  if (props.blocked)
    return (
      <ButtonSecondary
        compact
        disabled={busy}
        onClick={() =>
          run(
            () => unblockAccount({ did: props.did }),
            () => "Account unblocked",
          )
        }
      >
        {busy ? <DotLoader /> : "Unblock"}
      </ButtonSecondary>
    );
  return (
    <ButtonPrimary
      compact
      disabled={busy}
      onClick={() =>
        run(
          () => blockAccount({ did: props.did }),
          () => "Account blocked",
        )
      }
    >
      {busy ? <DotLoader /> : "Block account"}
    </ButtonPrimary>
  );
}
