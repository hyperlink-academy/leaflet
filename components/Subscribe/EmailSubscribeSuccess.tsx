"use client";

import { SpeedyLink } from "components/SpeedyLink";
import { LinkHandle } from "./HandleSubscribe";

export const EmailSubscribeSuccess = (props: {
  email: string | undefined;
  handle: string | undefined;
}) => {
  return (
    <div className="flex flex-col text-center justify-center pt-4 text-secondary w-md max-w-full">
      <h2 className="text-primary pb-1">You've Subscribed!</h2>
      You'll recieve new posts to <br />
      <span className="italic">{props.email ? props.email : "your email"}</span>
      {!props.handle ? (
        <>
          <hr className="my-4 border-border-light" />
          <div className="accent-container p-3">
            <LinkHandle compact />
          </div>
        </>
      ) : (
        <>
          <hr className="my-4 border-border-light" />

          <div>
            You also get updates in the <br />
            <SpeedyLink href={"/reader"} className="font-bold">
              Leaflet Reader
            </SpeedyLink>
          </div>
          <span className="text-tertiary text-sm">
            or any atmospheric reader!
          </span>
        </>
      )}
    </div>
  );
};
