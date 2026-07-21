"use client";
import { useEffect, useState } from "react";
import { useDocumentOptional } from "contexts/DocumentContext";
import { ButtonPrimary } from "components/Buttons";
import { LockTiny } from "components/Icons/LockTiny";
import { JoinMembershipModal } from "components/Memberships/JoinMembershipModal";

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

// Rendered in place of the members-only delimiter for readers without an
// active membership; the gated blocks were already dropped server-side.
export const MembersOnlyPaywall = () => {
  let document = useDocumentOptional();
  let [joinOpen, setJoinOpen] = useState(false);

  // Reopen the join modal after flows that leave the page: the Stripe hosted
  // card-setup return (wallet_session, which JoinTiers processes once
  // mounted) and OAuth login (the join_flow marker, consumed here).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("wallet_session") && !params.has("join_flow")) return;
    setJoinOpen(true);
    if (params.has("join_flow")) {
      params.delete("join_flow");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      );
    }
  }, []);

  let pub = document?.publication;
  if (!pub) return null;
  let tiers = document?.membersOnly?.tiers ?? [];
  let cheapest = tiers[0]
    ? tiers.reduce((min, t) =>
        t.monthly_price_cents < min.monthly_price_cents ? t : min,
      )
    : null;

  return (
    <div className="membersOnlyPaywall my-4 flex flex-col items-center gap-2 text-center block-border bg-bg-page px-4 py-6">
      <div className="flex items-center gap-1 font-bold text-primary">
        <LockTiny />
        This post is for members
      </div>
      <p className="text-secondary text-sm max-w-prose">
        Become a member of {pub.name} to read the rest
        {cheapest
          ? ` — starting at ${formatPrice(cheapest.monthly_price_cents)}/month`
          : ""}
        .
      </p>
      <ButtonPrimary type="button" onClick={() => setJoinOpen(true)}>
        Become a member
      </ButtonPrimary>
      <JoinMembershipModal
        open={joinOpen}
        onOpenChange={setJoinOpen}
        publicationUri={pub.uri}
        publicationName={pub.name}
        tiers={tiers}
      />
    </div>
  );
};
