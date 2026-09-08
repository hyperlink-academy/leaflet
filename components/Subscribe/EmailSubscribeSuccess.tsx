"use client";

import { SpeedyLink } from "components/SpeedyLink";
import { LinkHandle } from "./HandleSubscribe";
import { SubscribeSuccess } from "./SubscribeSuccess";

export const EmailSubscribeSuccess = (props: {
  email: string | undefined;
  handle: string | undefined;
  publicationUri?: string;
}) => {
  return (
    <SubscribeSuccess publicationUri={props.publicationUri}>
      <div>
        You'll receive new posts to{" "}
        <em>{props.email ? props.email : "your email"}</em>
      </div>
      <div>
        and in the{" "}
        <SpeedyLink href={"https://leaflet.pub/reader"} className="">
          Leaflet Reader
        </SpeedyLink>
      </div>
    </SubscribeSuccess>
  );
};
