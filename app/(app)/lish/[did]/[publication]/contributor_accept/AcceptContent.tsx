"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { LoginContent } from "components/LoginButton";
import { acceptContributorInvitation } from "actions/publications/contributors";

type AcceptState =
  | "no_publication"
  | "not_signed_in"
  | "not_invited"
  | "already_owner"
  | "pending"
  | "already_member";

// The remaining non-pending states all render the same shape: a heading, a
// paragraph, and a single link button. Only the copy and destination differ.
const STATIC_STATES: Record<
  Exclude<AcceptState, "pending" | "not_signed_in">,
  {
    title: string;
    body: (name: string) => React.ReactNode;
    href: (dashboardHref: string) => string;
    cta: string;
    primary?: boolean;
  }
> = {
  no_publication: {
    title: "Publication not found",
    body: () => "We couldn't find that publication.",
    href: () => "/home",
    cta: "Back to Home",
  },
  not_invited: {
    title: "No invitation found",
    body: () =>
      "You must be invited to contribute to a publication. Contact the publication owner.",
    href: () => "/home",
    cta: "Back to Home",
  },
  already_owner: {
    title: "You own this publication",
    body: (name) => `You're already the owner of ${name}.`,
    href: (dashboardHref) => dashboardHref,
    cta: "Open Dashboard",
    primary: true,
  },
  already_member: {
    title: "You're already a contributor",
    body: (name) => `You're already contributing to ${name}.`,
    href: (dashboardHref) => dashboardHref,
    cta: "Open Dashboard",
    primary: true,
  },
};

export function AcceptContent(props: {
  publicationUri: string | null;
  publicationName: string;
  state: AcceptState;
  dashboardHref: string;
}) {
  let router = useRouter();
  let toaster = useToaster();
  let [accepting, setAccepting] = useState(false);

  let handleAccept = async () => {
    if (!props.publicationUri || accepting) return;
    setAccepting(true);
    let res = await acceptContributorInvitation(props.publicationUri);
    setAccepting(false);
    if (!res.ok) {
      toaster({
        type: "error",
        content:
          res.error === "not_invited"
            ? "You haven't been invited."
            : "Something went wrong. Try again.",
      });
      return;
    }
    toaster({
      type: "success",
      content: `You're now a contributor on ${props.publicationName}.`,
    });
    router.push(props.dashboardHref);
  };

  let body: React.ReactNode;
  if (props.state === "not_signed_in") {
    body = (
      <>
        <h3 className="text-secondary">Sign in to accept your invitation</h3>
        <p className="text-tertiary leading-snug pb-2">
          Sign in with the Bluesky account that received the invitation to
          contribute to{" "}
          <span className="font-bold">{props.publicationName}</span>.
        </p>
        <LoginContent pageView noEmailLogin />
      </>
    );
  } else if (props.state === "pending") {
    body = (
      <>
        <h3 className="text-secondary">
          Contribute to {props.publicationName}?
        </h3>
        <p className="text-tertiary leading-snug">
          You've been invited to contribute. As a contributor you can create
          drafts and publish posts on behalf of the publication.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Link href="/home">
            <ButtonSecondary type="button" disabled={accepting}>
              Decline
            </ButtonSecondary>
          </Link>
          <ButtonPrimary
            type="button"
            disabled={accepting}
            onClick={handleAccept}
          >
            {accepting ? <DotLoader /> : "Accept Invitation"}
          </ButtonPrimary>
        </div>
      </>
    );
  } else {
    let s = STATIC_STATES[props.state];
    let Button = s.primary ? ButtonPrimary : ButtonSecondary;
    body = (
      <>
        <h3 className="text-secondary">{s.title}</h3>
        <p className="text-tertiary leading-snug">
          {s.body(props.publicationName)}
        </p>
        <Link href={s.href(props.dashboardHref)} className="self-center">
          <Button>{s.cta}</Button>
        </Link>
      </>
    );
  }

  return (
    <div className="h-full w-full flex place-items-center text-center">
      <div className="frosted-container p-4 max-w-md mx-auto justify-center place-items-center flex flex-col gap-2">
        {body}
      </div>
    </div>
  );
}
