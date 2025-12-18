"use client";
import { ProfilePopover } from "components/ProfilePopover";

export const PublicationAuthor = (props: {
  did: string;
  displayName?: string;
  handle: string;
}) => {
  return (
    <p className="italic text-tertiary sm:text-base text-sm">
      <ProfilePopover
        didOrHandle={props.did}
        trigger={
          <span className="hover:underline">
            <strong>by {props.displayName}</strong> @{props.handle}
          </span>
        }
      />
    </p>
  );
};
