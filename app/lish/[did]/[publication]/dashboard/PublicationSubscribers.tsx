"use client";
import { AppBskyActorProfile } from "lexicons/api";
import { usePublicationData } from "./PublicationSWRProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { ButtonPrimary } from "components/Buttons";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { useSmoker } from "components/Toast";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { Menu, MenuItem, Separator } from "components/Layout";
import { MoreOptionsTiny } from "components/Icons/MoreOptionsTiny";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { Checkbox } from "components/Checkbox";
import { useEffect, useState } from "react";
import { Popover } from "components/Popover";

type subscriber = { email: string | undefined; handle: string | undefined };
let subscribers: subscriber[] = [
  { email: "thisiscelinepark@gmail.com", handle: "cozylittle.house" },
  { email: "jared@awarm.space", handle: "awarm.space" },
  { email: "brendan.schlagel@gmail.com", handle: "schlage.town" },
];

export function PublicationSubscribers() {
  let { data: publication } = usePublicationData();
  let [checkedSubscribers, setCheckedSubscribers] = useState<subscriber[]>([]);
  let [checkAll, setCheckAll] = useState(false);

  useEffect(() => {
    const allSubscribersSelected = subscribers.every((subscriber) =>
      checkedSubscribers.some(
        (checked) =>
          checked.email === subscriber.email &&
          checked.handle === subscriber.handle,
      ),
    );

    if (allSubscribersSelected && subscribers.length > 0) {
      setCheckAll(true);
    } else {
      setCheckAll(false);
    }
  }, [checkedSubscribers]);

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
    <div>
      <div className="subscriberListHeader flex gap-2 ">
        <Checkbox
          checked={checkAll}
          onChange={() => {
            if (checkAll === false) {
              const allSubscribers = subscribers.map((subscriber) => ({
                email: subscriber.email,
                handle: subscriber.handle,
              }));
              setCheckedSubscribers(allSubscribers);
            } else {
              setCheckedSubscribers([]);
            }
          }}
          className="!font-bold text-secondary mb-1"
        >
          {subscribers.length} Subscriber{subscribers.length !== 1 && "s"}
        </Checkbox>
        {checkedSubscribers.length !== 0 && (
          <SubscriberOptions
            checkedSubscribers={checkedSubscribers}
            allSelected={checkedSubscribers.length === subscribers.length}
          />
        )}
      </div>
      <hr className="mb-2 border-border" />
      <div className="subscriberListContent flex gap-3 flex-col">
        {subscribers.map((subscriber) => {
          return (
            <DummySubscriber
              key={`${subscriber.email}-${subscriber.handle}`}
              handle={subscriber.handle}
              email={subscriber.email}
              checkedSubscribers={checkedSubscribers}
              setCheckedSubscribers={setCheckedSubscribers}
              checked={checkedSubscribers.some(
                (s) =>
                  s.email === subscriber.email &&
                  s.handle === subscriber.handle,
              )}
            />
          );
        })}

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
    </div>
  );
}

const DummySubscriber = (props: {
  handle: string | undefined;
  email: string | undefined;
  checkedSubscribers: subscriber[];
  setCheckedSubscribers: (subscribers: subscriber[]) => void;
  checked: boolean;
}) => {
  return (
    <Checkbox
      className="!font-normal"
      checked={props.checked}
      onChange={() => {
        if (props.checked === false) {
          const newCheckedSubscribers = [
            ...props.checkedSubscribers,
            {
              email: props.email,
              handle: props.handle,
            },
          ];
          props.setCheckedSubscribers(newCheckedSubscribers);
        } else {
          const newCheckedSubscribers = props.checkedSubscribers.filter(
            (subscriber) =>
              !(
                subscriber.email === props.email &&
                subscriber.handle === props.handle
              ),
          );
          props.setCheckedSubscribers(newCheckedSubscribers);
        }
        console.log(props.checkedSubscribers);
      }}
    >
      <div className=" flex justify-between w-full">
        <div className="flex flex-col gap-0 sm:flex-row sm:gap-2">
          <a
            target="_blank"
            href={"mailto:/"}
            className="font-bold  text-primary"
          >
            {props.email}
          </a>

          {props.handle && props.email && (
            <Separator classname="sm:block hidden" />
          )}
          {props.handle && (
            <a
              target="_blank"
              href={"mailto:/"}
              className={` ${!props.email ? "font-bold text-primary" : "text-tertiary"}`}
            >
              @{props.handle}
            </a>
          )}
        </div>
      </div>
      <div className="px-1 py-0 h-max rounded-md accent-container border border-border text-tertiary">
        Free
      </div>
    </Checkbox>
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

const SubscriberOptions = (props: {
  checkedSubscribers: subscriber[];
  allSelected: boolean;
}) => {
  return (
    <Menu
      asChild
      className=""
      trigger={
        <ButtonPrimary compact className="-mt-[1px]">
          {props.allSelected ? "All" : props.checkedSubscribers.length} Selected{" "}
          <MoreOptionsVerticalTiny />
        </ButtonPrimary>
      }
    >
      <MenuItem className="justify-center" onSelect={() => {}}>
        Export {props.allSelected ? "All" : "Selected"}
      </MenuItem>
      <MenuItem className="justify-center" onSelect={() => {}}>
        Remove {props.allSelected ? "All" : "Selected"}
      </MenuItem>
    </Menu>
  );
};
