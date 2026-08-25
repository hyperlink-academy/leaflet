"use client";
import { useEffect, useState } from "react";
import {
  previewMembershipChange,
  type MembershipChangePreview,
} from "actions/memberships";
import { DotLoader } from "components/utils/DotLoader";

export function formatMoney(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export type ChangePreviewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; preview: MembershipChangePreview };

export function useChangePreview(args: {
  enabled: boolean;
  membershipId: string;
  tierId: string | null;
  cadence: "month" | "year";
}): ChangePreviewState | null {
  const { enabled, membershipId, tierId, cadence } = args;
  const [state, setState] = useState<ChangePreviewState | null>(null);

  useEffect(() => {
    if (!enabled || !tierId) {
      setState(null);
      return;
    }
    let stale = false;
    setState({ status: "loading" });
    previewMembershipChange({ membershipId, tierId, cadence })
      .then((res) => {
        if (stale) return;
        setState(
          res.ok
            ? { status: "ready", preview: res.value }
            : { status: "error" },
        );
      })
      .catch(() => {
        if (!stale) setState({ status: "error" });
      });
    return () => {
      stale = true;
    };
  }, [enabled, membershipId, tierId, cadence]);

  return state;
}

function changePreviewText(preview: MembershipChangePreview): string {
  const { amountDueCents, currency, creditCents } = preview;
  const amount = formatMoney(amountDueCents, currency);
  const credit = formatMoney(creditCents, currency);

  if (amountDueCents <= 0) {
    return creditCents > 0
      ? `The unused time on your current plan leaves ${credit} in credit toward future invoices.`
      : "The unused time on your current plan covers your next invoice.";
  }
  return `You'll be charged ${amount} now, prorated for the time left on your current plan.`;
}

export function ChangePreviewLine(props: {
  state: ChangePreviewState | null;
  className?: string;
}) {
  if (!props.state) return null;
  const text =
    props.state.status === "loading" ? (
      <DotLoader />
    ) : props.state.status === "error" ? (
      "Changing plans prorates your bill. You'll be charged the exact amount for the rest of the period when you confirm."
    ) : (
      changePreviewText(props.state.preview)
    );

  return <div className={props.className}>{text}</div>;
}
