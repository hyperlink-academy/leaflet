"use client";
import { ButtonPrimary } from "components/Buttons";
import Link from "next/link";
import { useState } from "react";

import { Input } from "components/Input";
import { useIdentityData } from "components/IdentityProvider";
import { NewDraftButton } from "app/lish/[handle]/[publication]/NewDraftButton";
import { Popover } from "components/Popover";
import { BlueskyLogin } from "app/login/LoginForm";
export const MyPublicationList = () => {
  let { identity } = useIdentityData();
  if (!identity) return null;
  if (!identity.atp_did)
    return (
      <div>
        <Popover
          asChild
          trigger={
            <ButtonPrimary className="place-self-start text-sm">
              Log in with bluesky to create a publication!
            </ButtonPrimary>
          }
        >
          <BlueskyLogin />
        </Popover>
      </div>
    );
  return (
    <div className="w-full flex flex-col gap-2 container mx-8 mt-8">
      <PublicationList publications={identity.publications} />
      <Link
        href={"./lish/createPub"}
        className="text-sm place-self-start text-tertiary hover:text-accent-contrast"
      >
        New Publication
      </Link>
    </div>
  );
};

const PublicationList = (props: {
  publications: {
    identity_did: string;
    indexed_at: string;
    name: string;
    uri: string;
  }[];
}) => {
  let { identity } = useIdentityData();

  return (
    <div className="w-full grid auto-rows-max p-4">
      {props.publications?.map((d) => (
        <Publication
          {...d}
          key={d.uri}
          handle={identity?.resolved_did?.alsoKnownAs?.[0].slice(5)!}
        />
      ))}
    </div>
  );
};

function Publication(props: { uri: string; name: string; handle: string }) {
  return (
    <Link
      className="p-3 rounded-lg bg-bg-page flex flex-col gap-1 text-primary justify-center w-min"
      href={`/lish/${props.handle}/${props.name}/`}
    >
      <div className="w-8 h-8 rounded-full bg-test" />
      <div className="text-lg font-bold">{props.name}</div>
    </Link>
  );
}
