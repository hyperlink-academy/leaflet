"use client";
import { useEffect, useState } from "react";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
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

function changePreviewText(
  preview: MembershipChangePreview,
  effectiveDate: string,
): string {
  const { immediate, totalCents, amountDueCents, currency } = preview;
  if (!immediate) {
    return `You'll keep your current plan ${
      effectiveDate
        ? `until ${effectiveDate}`
        : "until the end of your billing period"
    }, then switch. Nothing is charged today.`;
  }
  if (totalCents === 0)
    return "Same price as your current plan, so you switch right away with nothing to pay.";
  if (amountDueCents <= 0)
    return "Your account credit covers the rest of this period.";
  return `You'll be charged ${formatMoney(amountDueCents, currency)} now, prorated for the time left on your current plan.`;
}

const PREVIEW_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

export function ChangePreviewLine(props: {
  state: ChangePreviewState | null;
  className?: string;
}) {
  const preview =
    props.state?.status === "ready" ? props.state.preview : undefined;
  const date = useLocalizedDate(
    preview?.effectiveDate ?? "",
    PREVIEW_DATE_FORMAT,
  );

  if (!props.state) return null;
  const text =
    props.state.status === "loading" ? (
      <DotLoader />
    ) : props.state.status === "error" ? (
      "Upgrades are charged now, prorated for the rest of the period. Downgrades take effect when the period ends."
    ) : (
      changePreviewText(
        props.state.preview,
        props.state.preview.effectiveDate ? date : "",
      )
    );

  return <div className={props.className}>{text}</div>;
}
