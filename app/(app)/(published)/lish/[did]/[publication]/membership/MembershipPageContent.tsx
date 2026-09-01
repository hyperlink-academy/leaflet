"use client";
import { useEffect, useState } from "react";
import { JoinMembershipFlow } from "components/Memberships/JoinMembershipFlow";
import {
  readJoinResume,
  type JoinResume,
} from "components/Memberships/joinReturn";
import type { MembershipTiers } from "src/membership";

// The membership modal (JoinMembershipFlow) hosted as a page: the tiers render
// from the cached page for everyone, and the flow's buttons take on the
// viewer's state — join, upgrade, change, cancel, resume — as it loads.
export function MembershipPageContent(props: {
  publicationUri: string;
  publicationName: string;
  publicationUrl: string;
  newsletterMode: boolean;
  tiers: MembershipTiers;
}) {
  const [resume, setResume] = useState<JoinResume | null>(null);

  // Stripe card-setup checkouts and sign-ins started here return with markers;
  // claim them so the flow finishes the join.
  useEffect(() => {
    setResume(readJoinResume());
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
      <a
        href={props.publicationUrl}
        className="text-tertiary text-sm hover:text-accent-contrast no-underline"
      >
        ← {props.publicationName}
      </a>
      <JoinMembershipFlow
        active
        publicationUri={props.publicationUri}
        publicationName={props.publicationName}
        publicationUrl={props.publicationUrl}
        newsletterMode={props.newsletterMode}
        tiers={props.tiers}
        resume={resume}
        source={{ placement: "membership_page" }}
      />
    </div>
  );
}
