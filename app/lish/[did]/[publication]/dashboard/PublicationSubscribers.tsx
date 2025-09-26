"use client";
import { AppBskyActorProfile } from "lexicons/api";
import { usePublicationData } from "./PublicationSWRProvider";
import { ButtonPrimary } from "components/Buttons";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { useSmoker } from "components/Toast";
import { Menu, MenuItem, Separator } from "components/Layout";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { Checkbox } from "components/Checkbox";
import { useEffect, useState } from "react";

type subscriber = { email: string | undefined; did: string | undefined };

// HELLO! THIS FILE HAS CHECKBOXES AND A HEADER COMMENTED OUT
// the checkboxes would let you select users and and the eader provided a count and let you select all and do actions
// I also removed some props from SubscriberListItem around emails since we dont have them yet.
// WHen we get emails in, we can uncomment some of this stuff

export function PublicationSubscribers(props: {
  showPageBackground?: boolean;
}) {
  let smoker = useSmoker();
  let { data: publication } = usePublicationData();
  // let [checkedSubscribers, setCheckedSubscribers] = useState<subscriber[]>([]);
  // let [checkAll, setCheckAll] = useState(false);

  if (!publication) return <div>null</div>;
  let subscribers = publication.publication?.publication_subscriptions || [];

  // useEffect(() => {
  //   const allSubscribersSelected = subscribers.every((subscriber) =>
  //     checkedSubscribers.some(
  //       (checked) =>
  //         checked.email === "dummyemail@email.com" &&
  //         checked.did === subscriber.identities?.bsky_profiles?.did,
  //     ),
  //   );

  //   if (allSubscribersSelected && subscribers.length > 0) {
  //     setCheckAll(true);
  //   } else {
  //     setCheckAll(false);
  //   }
  // }, [checkedSubscribers]);

  if (subscribers.length === 0)
    return (
      <div
        className={`italic text-tertiary  flex flex-col gap-0 text-center justify-center mt-4 border rounded-md ${props.showPageBackground ? "border-border-light p-2" : "border-transparent"}`}
        style={
          props.showPageBackground
            ? {
                backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha)) ",
              }
            : { backgroundColor: "transparent" }
        }
      >
        <p className="font-bold"> No subscribers yet </p>
        <p>Start sharing your publication!</p>
        <ButtonPrimary
          className="mx-auto mt-2"
          onClick={(e) => {
            e.preventDefault();
            let rect = (e.currentTarget as Element)?.getBoundingClientRect();
            navigator.clipboard.writeText(
              getPublicationURL(publication.publication!),
            );
            smoker({
              position: {
                x: rect ? rect.left + (rect.right - rect.left) / 2 : 0,
                y: rect ? rect.top + 26 : 0,
              },
              text: "Copied Publication URL!",
            });
          }}
        >
          Copy Share Link
        </ButtonPrimary>
      </div>
    );

  return (
    <div
      className={`rounded-md ${props.showPageBackground ? "border-border-light p-2" : "border-transparent"}`}
      style={
        props.showPageBackground
          ? {
              backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha)) ",
            }
          : { backgroundColor: "transparent" }
      }
    >
      {/*<div className="subscriberListHeader flex gap-2 ">
        <Checkbox
          checked={checkAll}
          onChange={() => {
            if (checkAll === false) {
              const allSubscribers = subscribers.map((subscriber) => ({
                email: "dummyemail@email.com",
                did: subscriber.identities?.bsky_profiles?.did,
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
      </div>*/}
      <div className="!font-bold text-secondary mb-1">
        {subscribers.length} Subscriber{subscribers.length !== 1 && "s"}
      </div>
      <hr className="mb-2 border-border " />
      <div className="subscriberListContent flex gap-3 flex-col ">
        {subscribers
          .sort((a, b) => {
            return b.created_at.localeCompare(a.created_at);
          })
          .map((subscriber, index) => {
            if (!subscriber.identities?.bsky_profiles) return null;
            let handle = subscriber.identities?.bsky_profiles.handle;
            let did = subscriber.identities?.bsky_profiles.did;
            let profile = subscriber.identities?.bsky_profiles
              ?.record as AppBskyActorProfile.Record | null;
            if (!profile) return null;
            return (
              <SubscriberListItem
                key={`${subscriber.identities.bsky_profiles?.did}`}
                handle={handle ? handle : undefined}
                did={`${subscriber.identities.bsky_profiles?.did}`}
                createdAt={subscriber.created_at}
              />
            );
          })}
      </div>
    </div>
  );
}

const SubscriberListItem = (props: {
  handle: string | undefined;
  did: string | undefined;
  createdAt: string;
}) => {
  return (
    // <Checkbox
    //   className="!font-normal"
    //   checked={props.checked}
    //   onChange={() => {
    //     if (props.checked === false) {
    //       const newCheckedSubscribers = [
    //         ...props.checkedSubscribers,
    //         {
    //           email: props.email,
    //           did: props.did,
    //         },
    //       ];
    //       props.setCheckedSubscribers(newCheckedSubscribers);
    //     } else {
    //       const newCheckedSubscribers = props.checkedSubscribers.filter(
    //         (subscriber) =>
    //           !(
    //             subscriber.email === props.email && subscriber.did === props.did
    //           ),
    //       );
    //       props.setCheckedSubscribers(newCheckedSubscribers);
    //     }
    //     console.log(props.checkedSubscribers);
    //   }}
    // >
    <>
      <div className="flex items-end flex-row gap-2 w-full">
        {/*<a
            target="_blank"
            href={`mailto:${props.email}`}
            className="font-bold  text-primary"
          >
            {props.email}
          </a>

          {props.handle && props.email && (
            <Separator classname="sm:block hidden" />
          )}*/}
        {props.handle && (
          <a
            target="_blank"
            href={`https://bsky.app/profile/${props.did}`}
            className={"font-bold"}
          >
            @{props.handle}
          </a>
        )}
        <div className="px-1 py-0 h-max rounded-md text-sm italic text-tertiary">
          {new Date(props.createdAt).toLocaleString(undefined, {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
          })}
        </div>
      </div>
    </>
    // </Checkbox>
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
