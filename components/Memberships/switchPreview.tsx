"use client";
import { useEffect, useState } from "react";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  previewMembershipSwitch,
  type MembershipSwitchPreview,
} from "actions/memberships";
import { DotLoader } from "components/utils/DotLoader";

// Tier prices are stored in cents throughout, so the connected account's
// currency only decides the symbol here.
export function formatMoney(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export type SwitchPreviewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; preview: MembershipSwitchPreview };

// Quotes the selected plan change. Refetches on every selection change and
// drops stale responses, so a slow request for a tier the reader has already
// clicked past can't overwrite the current quote. `enabled` is false when
// there's nothing to quote (no selection, or the current plan re-picked).
export function useSwitchPreview(args: {
  enabled: boolean;
  membershipId: string;
  tierId: string;
  cadence: "month" | "year";
}): SwitchPreviewState | null {
  const { enabled, membershipId, tierId, cadence } = args;
  const [state, setState] = useState<SwitchPreviewState | null>(null);

  useEffect(() => {
    if (!enabled || !tierId) {
      setState(null);
      return;
    }
    let stale = false;
    setState({ status: "loading" });
    previewMembershipSwitch({ membershipId, tierId, cadence })
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

// The sentence describing what a switch bills. `formattedDate` is passed in
// because the caller's hook owns the reader's locale and timezone.
function switchPreviewText(
  preview: MembershipSwitchPreview,
  formattedDate: string,
): string {
  const { immediate, amountDueCents, currency, creditCents } = preview;
  const amount = formatMoney(amountDueCents, currency);
  const credit = formatMoney(creditCents, currency);

  // Changing between monthly and annual restarts the billing period, so Stripe
  // bills the new plan now, less credit for the time already paid for.
  if (immediate) {
    if (amountDueCents <= 0) {
      return creditCents > 0
        ? `The unused time on your current plan leaves ${credit} in credit toward future invoices.`
        : "The unused time on your current plan covers the change.";
    }
    return `You'll be charged ${amount} now, prorated for the time left on your current plan.`;
  }

  const when = formattedDate ? `on ${formattedDate}` : "at your next renewal";
  if (creditCents > 0) {
    return `Unused time on your current plan leaves ${credit} in credit toward future invoices. Your next invoice will be ${when} for ${amount}.`;
  }
  return `Your next invoice will be ${when} for ${amount}, prorated for the switch.`;
}

const PREVIEW_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

// The one place both switch surfaces get their billing copy, so the modal and
// the join flow can't describe the same charge differently.
export function SwitchPreviewLine(props: {
  state: SwitchPreviewState | null;
  className?: string;
}) {
  const preview =
    props.state?.status === "ready" ? props.state.preview : undefined;
  const date = useLocalizedDate(
    preview?.nextInvoiceDate ?? "",
    PREVIEW_DATE_FORMAT,
  );

  if (!props.state) return null;
  const text =
    props.state.status === "loading" ? (
      <DotLoader />
    ) : props.state.status === "error" ? (
      "Switching prorates your bill — you'll see the exact amount on your next invoice."
    ) : (
      switchPreviewText(
        props.state.preview,
        props.state.preview.nextInvoiceDate ? date : "",
      )
    );

  return <div className={props.className}>{text}</div>;
}
