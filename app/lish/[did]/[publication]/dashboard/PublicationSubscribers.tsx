"use client";
import { AppBskyActorProfile } from "lexicons/api";
import { usePublicationData } from "./PublicationSWRProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { ButtonPrimary } from "components/Buttons";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { useSmoker } from "components/Toast";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { Separator } from "components/Layout";

export function PublicationSubscribers() {
  let { data: publication } = usePublicationData();
  let smoker = useSmoker();

  if (!publication) return <div>null</div>;
  // if (publication.publication_subscriptions.length === 0)
  //   return (
  //     <div className="italic text-tertiary  flex flex-col gap-0 text-center justify-center pt-4">
  //       <p className="font-bold"> No subscribers yet </p>
  //       <p>Start sharing your publication!</p>
  //       <ButtonPrimary
  //         className="mx-auto mt-2"
  //         onClick={(e) => {
  //           e.preventDefault();
  //           let rect = (e.currentTarget as Element)?.getBoundingClientRect();
  //           navigator.clipboard.writeText(getPublicationURL(publication!));
  //           smoker({
  //             position: {
  //               x: rect ? rect.left + (rect.right - rect.left) / 2 : 0,
  //               y: rect ? rect.top + 26 : 0,
  //             },
  //             text: "Copied Publication URL!",
  //           });
  //         }}
  //       >
  //         Copy Share Link
  //       </ButtonPrimary>
  //     </div>
  //   );

  return (
    <div className="flex gap-2 flex-col">
      <DummySubscriber
        handle="@cozylittle.house"
        displayName="celine"
        email="thisiscelinepark@gmail.com"
      />
      <DummySubscriber
        handle="@awarm.space"
        displayName="jared"
        email="jared@awarm.space"
      />
      <DummySubscriber
        handle="@schlage.town"
        displayName="Brendan"
        email="brendan.schlagel@gmail.com"
      />
      {/* {publication.publication_subscriptions
          .sort((a, b) => {
            return b.created_at.localeCompare(a.created_at);
          })
          .map((subscriber, index) => {
            if (!subscriber.identities?.bsky_profiles) return null;
            let handle = subscriber.identities?.bsky_profiles.handle;
            let profile = subscriber.identities?.bsky_profiles
              ?.record as AppBskyActorProfile.Record | null;
            if (!profile) return null;
            return (
              <Subscriber
                key={subscriber.identities.bsky_profiles?.did}
                profile={profile}
                did={subscriber.identities.bsky_profiles?.did}
                handle={handle}
              />
            );
          })} */}
    </div>
  );
}

const DummySubscriber = (props: {
  displayName: string;
  handle: string;
  email: string;
}) => {
  return (
    <div>
      <a
        target="_blank"
        href={"/"}
        className="flex text-primary p-2 gap-1 hover:!no-underline"
      >
        <div className="flex flex-row gap-2">
          <div className="rounded-full w-5 h-5 bg-test mt-[2px]" />
          <div className="flex flex-col">
            <p className="font-bold">{props.displayName}</p>
            <div className="flex gap-3">
              <p className="text-secondary text-sm flex gap-2 items-center">
                <BlueskyTiny />
                {props.email}
              </p>
              <Separator />
              <p className="text-secondary text-sm flex gap-2 items-center">
                <BlueskyTiny />
                {props.handle}
              </p>
            </div>
          </div>
        </div>
      </a>
      <hr className="border-border last:hidden" />
    </div>
  );
};

const Subscriber = (props: {
  profile: AppBskyActorProfile.Record;
  did: string;
  handle: string | null;
}) => {
  return (
    <div className="subscriber">
      <a
        target="_blank"
        href={`https://bsky.app/profile/${props.did}`}
        className="flex text-primary p-2 gap-1"
      >
        <div className="flex flex-row gap-2">
          {props.profile.avatar && (
            <img
              className="rounded-full w-8 h-8"
              src={
                props.profile?.avatar &&
                blobRefToSrc(props.profile.avatar.ref, props.did)
              }
              alt={props.profile.displayName}
            />
          )}
          <div className="flex flex-col gap-1">
            <h3>{props.profile.displayName}</h3>
            <p>@{props.handle}</p>
          </div>
        </div>
      </a>
      <hr className="border-border last:hidden" />
    </div>
  );
};
