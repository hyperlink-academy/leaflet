"use client";
import { useEffect, useState } from "react";
import { JoinMembershipFlow } from "components/Memberships/JoinMembershipFlow";
import {
  readJoinResume,
  type JoinResume,
} from "components/Memberships/joinReturn";
import type { Tier } from "components/Memberships/TierGrid";

// Hosts the paid join flow inline on the /join page — the same flow
// PaidSubscribeButton opens in a modal. Viewer state (wallet, membership,
// identity) is fetched client-side by the flow itself.
export function JoinPageContent(props: {
  publicationUri: string;
  publicationName: string;
  publicationUrl: string;
  newsletterMode: boolean;
  tiers: Tier[];
}) {
  const [resume, setResume] = useState<JoinResume | null>(null);

  // Stripe card-setup checkouts started here return to /join with markers;
  // claim them so the flow finishes the join.
  useEffect(() => {
    setResume(readJoinResume());
  }, []);

  return (
    <JoinMembershipFlow
      active
      publicationUri={props.publicationUri}
      publicationName={props.publicationName}
      publicationUrl={props.publicationUrl}
      newsletterMode={props.newsletterMode}
      tiers={props.tiers}
      resume={resume}
      source={{ placement: "join_page" }}
    />
  );
}
