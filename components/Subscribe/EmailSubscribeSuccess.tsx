"use client";

import { SpeedyLink } from "components/SpeedyLink";
import { DotLoader } from "components/utils/DotLoader";
import { LinkHandle } from "./HandleSubscribe";
import {
  RecommendedPublications,
  useSubscribeSuccessData,
} from "./RecommendedPublications";

export const EmailSubscribeSuccess = (props: {
  email: string | undefined;
  handle: string | undefined;
  publicationUri?: string;
}) => {
  let { loading, publicationName, listings } = useSubscribeSuccessData(
    props.publicationUri,
  );
  if (loading)
    return (
      <div className="flex justify-center items-center py-8 text-secondary w-full max-w-full sm:min-w-md">
        <DotLoader />
      </div>
    );
  return (
    <div className="flex flex-col text-center justify-center py-3 text-secondary w-full max-w-full sm:w-auto sm:min-w-md sm:max-w-2xl">
      <h2 className="text-primary pb-1">
        {publicationName
          ? `You've subscribed to ${publicationName}!`
          : "You've Subscribed!"}
      </h2>
      You'll receive new posts to <br />
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
            <SpeedyLink
              href={"https://leaflet.pub/reader"}
              className="font-bold"
            >
              Leaflet Reader
            </SpeedyLink>
          </div>
          <span className="text-tertiary text-sm">
            or any atmospheric reader!
          </span>
        </>
      )}
      <RecommendedPublications
        publicationName={publicationName}
        listings={listings}
      />
    </div>
  );
};
