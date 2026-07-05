"use client";
import { useDocumentOptional } from "contexts/DocumentContext";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { ButtonPrimary } from "components/Buttons";
import { LockTiny } from "components/Icons/LockTiny";

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
  let pub = document?.publication;
  if (!pub) return null;
  let tiers = document?.membersOnly?.tiers ?? [];
  let cheapest = tiers[0]
    ? tiers.reduce((min, t) =>
        t.monthly_price_cents < min.monthly_price_cents ? t : min,
      )
    : null;
  let joinUrl = `${getPublicationURL({ uri: pub.uri, record: pub.record }).replace(/\/$/, "")}/join`;

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
      <a href={joinUrl} className="hover:no-underline">
        <ButtonPrimary role="link" type="button">
          Become a member
        </ButtonPrimary>
      </a>
    </div>
  );
};
