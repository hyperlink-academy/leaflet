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

export function PublicationSubscribers() {
  let smoker = useSmoker();
  let { data: publication } = usePublicationData();
  let [checkedSubscribers, setCheckedSubscribers] = useState<subscriber[]>([]);
  let [checkAll, setCheckAll] = useState(false);

  if (!publication) return <div>null</div>;
  let subscribers = publication.publication_subscriptions;

  useEffect(() => {
    const allSubscribersSelected = subscribers.every((subscriber) =>
      checkedSubscribers.some(
        (checked) =>
          checked.email === "dummyemail@email.com" &&
          checked.did === subscriber.identities?.bsky_profiles?.did,
      ),
    );

    if (allSubscribersSelected && subscribers.length > 0) {
      setCheckAll(true);
    } else {
      setCheckAll(false);
    }
  }, [checkedSubscribers]);

  if (subscribers.length === 0)
    return (
      <div className="italic text-tertiary  flex flex-col gap-0 text-center justify-center pt-4">
        <p className="font-bold"> No subscribers yet </p>
        <p>Start sharing your publication!</p>
        <ButtonPrimary
          className="mx-auto mt-2"
          onClick={(e) => {
            e.preventDefault();
            let rect = (e.currentTarget as Element)?.getBoundingClientRect();
            navigator.clipboard.writeText(getPublicationURL(publication!));
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
    <div>
      <div className="subscriberListHeader flex gap-2 ">
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
      </div>
      <hr className="mb-2 border-border" />
      <div className="subscriberListContent flex gap-3 flex-col">
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
              // replace the dummy email with the subscriber email! i don't know how to get that data D:
              <SubscriberListItem
                key={`${subscriber.identities.bsky_profiles?.did}`}
                handle={handle ? handle : undefined}
                email={"dummyemail@email.com"}
                did={`${subscriber.identities.bsky_profiles?.did}`}
                createdAt={subscriber.created_at}
                checkedSubscribers={checkedSubscribers}
                setCheckedSubscribers={setCheckedSubscribers}
                checked={checkedSubscribers.some(
                  (s) => s.email === "dummyemail@email.com" && s.did === did,
                )}
              />
            );
          })}
      </div>
    </div>
  );
}

const SubscriberListItem = (props: {
  handle: string | undefined;
  email: string | undefined;
  did: string | undefined;
  createdAt: string;
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
              did: props.did,
            },
          ];
          props.setCheckedSubscribers(newCheckedSubscribers);
        } else {
          const newCheckedSubscribers = props.checkedSubscribers.filter(
            (subscriber) =>
              !(
                subscriber.email === props.email && subscriber.did === props.did
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
            href={`mailto:${props.email}`}
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
              href={`https://bsky.app/profile/${props.did}`}
              className={` ${!props.email ? "font-bold text-primary" : "text-tertiary"}`}
            >
              @{props.handle}
            </a>
          )}
        </div>
      </div>
      <div className="px-1 py-0 h-max rounded-md accent-container border border-border text-tertiary">
        {new Date(props.createdAt).toLocaleString(undefined, {
          year: "2-digit",
          month: "2-digit",
          day: "2-digit",
        })}
      </div>
    </Checkbox>
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
