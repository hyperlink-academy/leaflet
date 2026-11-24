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
  let [busy, setBusy] = useState(false);
  let run = async (
    action: () => ReturnType<typeof blockAccount>,
    done: (count: number) => string,
  ) => {
    if (busy) return false;
    setBusy(true);
    let res = await action();
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: res.error });
      return false;
    }
    toaster({ type: "success", content: done(res.value) });
    return true;
  };
  return { busy, run };
}

export function BlockSiteButton(props: { domain: string; accounts: number }) {
  let { busy, run } = useBlockAction();
  let router = useRouter();
  let [confirming, setConfirming] = useState(false);
  let count = `${props.accounts} account${props.accounts === 1 ? "" : "s"}`;
  if (!confirming)
    return (
      <ButtonSecondary compact onClick={() => setConfirming(true)}>
        Block {count}…
      </ButtonSecondary>
    );
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="text-sm text-secondary text-right leading-snug">
        Take down {count} devoted to {props.domain}? Their pages will 404 and
        they won't be able to publish.
      </div>
      {/* Cancel sits where the first button was, so a double click on it
          can't confirm. */}
      <div className="flex gap-2">
        <ButtonPrimary
          compact
          disabled={busy}
          onClick={async () => {
            let ok = await run(
              () => blockSite({ domain: props.domain }),
              (n) =>
                `Blocked ${n} account${n === 1 ? "" : "s"} devoted to ${props.domain}`,
            );
            if (!ok) return;
            setConfirming(false);
            router.refresh();
          }}
        >
          {busy ? <DotLoader /> : `Yes, block ${count}`}
        </ButtonPrimary>
        <ButtonSecondary
          compact
          disabled={busy}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </ButtonSecondary>
      </div>
    </div>
  );
}

// The result stays in the row instead of refreshing the list, so the account
// being worked on doesn't vanish and a wrong block can be undone in place.
export function BlockAccountButton(props: {
  did: string;
  name: string;
  blocked: boolean;
}) {
  let { busy, run } = useBlockAction();
  let [blocked, setBlocked] = useState(props.blocked);
  let toggle = async (e: React.MouseEvent<HTMLElement>) => {
    // The button is disabled and then replaced, either of which drops
    // keyboard focus; parking it on the card keeps j/k stepping from here.
    e.currentTarget
      .closest<HTMLElement>("[data-review-account]")
      ?.focus({ preventScroll: true });
    let ok = await run(
      () =>
        blocked
          ? unblockAccount({ did: props.did })
          : blockAccount({ did: props.did }),
      () => `${blocked ? "Unblocked" : "Blocked"} ${props.name}`,
    );
    if (ok) setBlocked(!blocked);
  };
  if (blocked)
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold">Blocked</span>
        <ButtonSecondary
          compact
          data-review-action
          disabled={busy}
          onClick={toggle}
        >
          {busy ? <DotLoader /> : "Unblock"}
        </ButtonSecondary>
      </div>
    );
  return (
    <ButtonPrimary compact data-review-action disabled={busy} onClick={toggle}>
      {busy ? <DotLoader /> : "Block account"}
    </ButtonPrimary>
  );
}
