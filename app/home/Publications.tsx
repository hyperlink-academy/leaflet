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
    <div className="w-full flex flex-col gap-2">
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
    <div className="w-full flex flex-col gap-2">
      {props.publications?.map((d) => (
        <div
          key={d.uri}
          className={`pubPostListItem flex hover:no-underline justify-between items-center`}
        >
          <Link
            className="justify-self-start font-bold hover:no-underline"
            href={`/lish/${identity?.resolved_did?.alsoKnownAs?.[0].slice(5)}/${d.name}/`}
          >
            <div key={d.uri}>{d.name}</div>
          </Link>
        </div>
      ))}
    </div>
  );
};
