"use client";
import { usePublicationData } from "./PublicationSWRProvider";
import { ButtonPrimary } from "components/Buttons";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { useSmoker } from "components/Toast";
import { Menu, MenuItem } from "components/Menu";
import { Separator } from "components/Layout";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";

type subscriber = { email: string | undefined; did: string | undefined };

type MergedSubscriber = {
  key: string;
  did: string | undefined;
  handle: string | undefined;
  email: string | undefined;
  created_at: string;
};

export function PublicationSubscribers(props: {
  showPageBackground?: boolean;
}) {
  let smoker = useSmoker();
  let { data: publication } = usePublicationData();

  if (!publication) return <div>null</div>;
  let atprotoSubs = publication.publication?.publication_subscriptions || [];
  let newsletterEnabled =
    !!publication.publication?.publication_newsletter_settings?.enabled;
  let emailSubs = newsletterEnabled
    ? (publication.publication?.publication_email_subscribers || []).filter(
        (s) => s.state === "confirmed",
      )
    : [];

  let byDid = new Map<string, MergedSubscriber>();
  let emailOnly: MergedSubscriber[] = [];
  for (let s of atprotoSubs) {
    let did = s.identities?.bsky_profiles?.did;
    if (!did) continue;
    byDid.set(did, {
      key: `did:${did}`,
      did,
      handle: s.identities?.bsky_profiles?.handle ?? undefined,
      email: undefined,
      created_at: s.created_at,
    });
  }
  for (let s of emailSubs) {
    let linkedDid = s.identities?.atp_did ?? undefined;
    let existing = linkedDid ? byDid.get(linkedDid) : undefined;
    if (existing) {
      existing.email = s.email;
      continue;
    }
    emailOnly.push({
      key: `email:${s.id}`,
      did: linkedDid,
      handle: s.identities?.bsky_profiles?.handle ?? undefined,
      email: s.email,
      created_at: s.created_at,
    });
  }
  let subscribers: MergedSubscriber[] = [...byDid.values(), ...emailOnly];

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
        className={`italic text-tertiary  flex flex-col gap-0 text-center justify-center py-4 border rounded-md ${props.showPageBackground ? "border-border-light p-2" : "border-transparent"}`}
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
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((subscriber) => (
            <SubscriberListItem
              key={subscriber.key}
              handle={subscriber.handle}
              did={subscriber.did}
              email={subscriber.email}
              createdAt={subscriber.created_at}
            />
          ))}
      </div>
    </div>
  );
}

const SubscriberListItem = (props: {
  handle: string | undefined;
  did: string | undefined;
  email: string | undefined;
  createdAt: string;
}) => {
  return (
    <div className="flex items-end flex-row gap-2 w-full">
      {props.handle && (
        <a
          target="_blank"
          href={`https://bsky.app/profile/${props.did}`}
          className="font-bold"
        >
          @{props.handle}
        </a>
      )}
      {props.handle && props.email && (
        <Separator classname="sm:block hidden" />
      )}
      {props.email && (
        <a
          target="_blank"
          href={`mailto:${props.email}`}
          className="font-bold text-primary"
        >
          {props.email}
        </a>
      )}
      <SubscriberDate createdAt={props.createdAt} />
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

function SubscriberDate(props: { createdAt: string }) {
  const formattedDate = useLocalizedDate(props.createdAt, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
  return (
    <div className="px-1 py-0 h-max rounded-md text-sm italic text-tertiary">
      {formattedDate}
    </div>
  );
}
