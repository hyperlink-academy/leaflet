"use client";
import { usePublicationData } from "./PublicationSWRProvider";
import { ButtonPrimary } from "components/Buttons";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { useSmoker } from "components/Toast";
import { Menu, MenuItem } from "components/Menu";
import { Separator } from "components/Layout";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useDashboardState } from "components/PageLayouts/dashboardState";
import { AtmosphereAccount } from "components/Icons/AtmosphereAccount";
import { EmailTiny } from "components/Icons/EmailTiny";

type subscriber = { email: string | undefined; did: string | undefined };

type SubscriberStatus = "subscribed" | "unconfirmed" | "unsubscribed";

type MergedSubscriber = {
  key: string;
  did: string | undefined;
  handle: string | undefined;
  email: string | undefined;
  created_at: string;
  status: SubscriberStatus;
};

export function useMergedSubscribers(): MergedSubscriber[] | null {
  let { data: publication } = usePublicationData();
  let { subscriberStatus } = useDashboardState();

  if (!publication) return null;
  // ATProto subscribers have no email lifecycle state — they're just present
  // or absent, so they only count under the "subscribed" status filter.
  let atprotoSubs = subscriberStatus.subscribed
    ? publication.publication?.publication_subscriptions || []
    : [];
  let newsletterEnabled =
    !!publication.publication?.publication_newsletter_settings?.enabled;
  let emailSubs = newsletterEnabled
    ? (publication.publication?.publication_email_subscribers || []).filter(
        (s) => {
          if (s.state === "confirmed") return subscriberStatus.subscribed;
          if (s.state === "pending") return subscriberStatus.unconfirmed;
          if (s.state === "unsubscribed") return subscriberStatus.unsubscribed;
          return false;
        },
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
      status: "subscribed",
    });
  }
  for (let s of emailSubs) {
    let status: SubscriberStatus =
      s.state === "pending"
        ? "unconfirmed"
        : s.state === "unsubscribed"
          ? "unsubscribed"
          : "subscribed";
    let linkedDid = s.identities?.atp_did ?? undefined;
    let existing = linkedDid ? byDid.get(linkedDid) : undefined;
    if (existing && status === "subscribed") {
      existing.email = s.email;
      continue;
    }
    emailOnly.push({
      key: `email:${s.id}`,
      did: linkedDid,
      handle: s.identities?.bsky_profiles?.handle ?? undefined,
      email: s.email,
      created_at: s.created_at,
      status,
    });
  }
  return [...byDid.values(), ...emailOnly];
}

export function PublicationSubscribers(props: {
  showPageBackground?: boolean;
}) {
  let smoker = useSmoker();
  let { data: publication } = usePublicationData();
  let { subscriberStatus } = useDashboardState();
  let subscribers = useMergedSubscribers();

  if (!publication || !subscribers) return <div>null</div>;

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

  let activeStatuses = (
    Object.keys(subscriberStatus) as SubscriberStatus[]
  ).filter((k) => subscriberStatus[k]);
  let isDefaultStatusFilter =
    activeStatuses.length === 1 && activeStatuses[0] === "subscribed";

  if (subscribers.length === 0) {
    if (!isDefaultStatusFilter) {
      let label =
        activeStatuses.length === 0
          ? "any status"
          : activeStatuses
              .map((s) => (s === "unconfirmed" ? "unconfirmed" : s))
              .join(", ");
      return (
        <div
          className={`italic text-tertiary
            flex flex-col gap-0 text-center justify-center py-4 border rounded-md ${props.showPageBackground ? "border-border-light p-2" : "border-transparent"}`}
          style={
            props.showPageBackground
              ? {
                  backgroundColor:
                    "rgba(var(--bg-page), var(--bg-page-alpha)) ",
                }
              : { backgroundColor: "transparent" }
          }
        >
          <p className="font-bold">No subscribers match your filters!</p>
        </div>
      );
    }
    return (
      <div
        className={`italic text-tertiary flex flex-col gap-0 text-center justify-center py-4 border rounded-md ${props.showPageBackground ? "border-border-light p-2" : "border-transparent"}`}
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
  }

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
      <div className="subscriberListContent flex gap-2 flex-col ">
        {subscribers
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((subscriber) => (
            <>
              <SubscriberListItem
                key={subscriber.key}
                handle={subscriber.handle}
                did={subscriber.did}
                email={subscriber.email}
                createdAt={subscriber.created_at}
                status={subscriber.status}
              />
              <hr className="border-border-light last:hidden" />
            </>
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
  status: SubscriberStatus;
}) => {
  let contactClassName =
    "flex flex-row gap-2 items-center border rounded-md px-1 text-sm w-full max-w-fit no-underline! hover:bg-[var(--accent-light)] hover:border-accent-contrast ";
  let subscribedClassName = " border-transparent font-bold text-secondary";
  let mutedClassName = "border-border bg-border-light text-tertiary";
  let unconfirmedClassName = "border-border-light animate-pulse text-tertiary";

  return (
    <div className="flex flex-row justify-between gap-2 w-full">
      <div className="flex flex-col gap-0.5 grow min-w-0 w-full">
        {props.handle && (
          <a
            target="_blank"
            href={`https://bsky.app/profile/${props.did}`}
            className={`${contactClassName} ${props.status === "subscribed" ? subscribedClassName : props.status === "unconfirmed" ? unconfirmedClassName : mutedClassName}`}
          >
            <AtmosphereAccount className="text-tertiary shrink-0" />
            {props.handle}
          </a>
        )}
        {props.handle && props.email && (
          <Separator classname="sm:block hidden" />
        )}
        {props.email && (
          <a
            target="_blank"
            href={`mailto:${props.email}`}
            className={`${contactClassName} ${props.status === "subscribed" ? subscribedClassName : props.status === "unconfirmed" ? unconfirmedClassName : mutedClassName}`}
          >
            <EmailTiny className="text-tertiary shrink-0" />{" "}
            <div className="truncate min-w-0 ">{props.email}</div>
          </a>
        )}
      </div>
      <div className="flex flex-row gap-2 shrink-0">
        {props.status !== "subscribed" && (
          <span className="text-sm italic text-tertiary">
            {props.status === "unconfirmed" ? "unconfirmed" : "unsubscribed"}
          </span>
        )}
        <SubscriberDate createdAt={props.createdAt} />
      </div>
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
