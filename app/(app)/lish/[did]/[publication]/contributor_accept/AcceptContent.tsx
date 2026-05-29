"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { acceptContributorInvitation } from "actions/publications/contributors";

type AcceptState =
  | "no_publication"
  | "not_signed_in"
  | "not_invited"
  | "already_owner"
  | "pending"
  | "already_member";

export function AcceptContent(props: {
  publicationUri: string | null;
  publicationName: string;
  state: AcceptState;
  signedIn: boolean;
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
  if (props.state === "no_publication") {
    body = (
      <>
        <h3 className="text-secondary">Publication not found</h3>
        <p className="text-tertiary leading-snug">
          We couldn't find that publication.
        </p>
        <Link href="/home" className="self-center">
          <ButtonSecondary>Back to Home</ButtonSecondary>
        </Link>
      </>
    );
  } else if (props.state === "not_signed_in") {
    body = (
      <>
        <h3 className="text-secondary">Sign in to accept your invitation</h3>
        <p className="text-tertiary leading-snug">
          Sign in with the Bluesky account that received the invitation to
          contribute to <span className="font-bold">{props.publicationName}</span>.
        </p>
        <Link href="/login" className="self-center">
          <ButtonPrimary>Sign In</ButtonPrimary>
        </Link>
      </>
    );
  } else if (props.state === "not_invited") {
    body = (
      <>
        <h3 className="text-secondary">No invitation found</h3>
        <p className="text-tertiary leading-snug">
          You must be invited to contribute to a publication. Contact the
          publication owner.
        </p>
        <Link href="/home" className="self-center">
          <ButtonSecondary>Back to Home</ButtonSecondary>
        </Link>
      </>
    );
  } else if (props.state === "already_owner") {
    body = (
      <>
        <h3 className="text-secondary">You own this publication</h3>
        <p className="text-tertiary leading-snug">
          You're already the owner of {props.publicationName}.
        </p>
        <Link href={props.dashboardHref} className="self-center">
          <ButtonPrimary>Open Dashboard</ButtonPrimary>
        </Link>
      </>
    );
  } else if (props.state === "already_member") {
    body = (
      <>
        <h3 className="text-secondary">You're already a contributor</h3>
        <p className="text-tertiary leading-snug">
          You're already contributing to {props.publicationName}.
        </p>
        <Link href={props.dashboardHref} className="self-center">
          <ButtonPrimary>Open Dashboard</ButtonPrimary>
        </Link>
      </>
    );
  } else {
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
  }

  return (
    <div className="h-full w-full flex place-items-center text-center">
      <div className="frosted-container p-4 max-w-md mx-auto justify-center place-items-center flex flex-col gap-2">
        {body}
      </div>
    </div>
  );
}
