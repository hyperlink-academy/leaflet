"use client";
import { ButtonPrimary } from "components/Buttons";
import { useSmoker } from "components/Toast";
import { Separator } from "components/Layout";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import {
  useDashboardState,
  useSetDashboardState,
} from "components/PageLayouts/dashboardState";
import { AtmosphereAccount } from "components/Icons/AtmosphereAccount";
import { EmailTiny } from "components/Icons/EmailTiny";
import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { Popover } from "components/Popover";
import { Checkbox } from "components/Checkbox";

export type SubscriberStatus = "subscribed" | "unconfirmed" | "unsubscribed";

export type MergedSubscriber = {
  key: string;
  did: string | undefined;
  handle: string | undefined;
  email: string | undefined;
  created_at: string;
  status: SubscriberStatus;
};

export function PublicationSubscribers(props: {
  subscribers: MergedSubscriber[];
  publicationShareUrl: string;
  publicationUri: string;
  showPageBackground: boolean;
}) {
  let smoker = useSmoker();
  let { subscriberStatus } = useDashboardState();
  let filtered = props.subscribers.filter((s) => subscriberStatus[s.status]);

  let activeStatuses = (
    Object.keys(subscriberStatus) as SubscriberStatus[]
  ).filter((k) => subscriberStatus[k]);
  let isDefaultStatusFilter =
    activeStatuses.length === 1 && activeStatuses[0] === "subscribed";

  let bgStyle = props.showPageBackground
    ? { backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha)) " }
    : { backgroundColor: "transparent" };
  let bgBorder = props.showPageBackground
    ? "border-border-light p-2"
    : "border-transparent";

  return (
    <DashboardPageLayout
      scrollKey={`dashboard-${props.publicationUri}-Subs`}
      pageTitle="Subscribers"
      mobileActions={<SubscriberStatusFilter />}
      publication={props.publicationUri}
      showHeader={true}
      controls={
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="font-bold text-secondary px-1">
            {filtered.length} Subscriber{filtered.length !== 1 && "s"}
          </div>
          <SubscriberStatusFilter />
        </div>
      }
    >
      {filtered.length === 0 ? (
        <div
          className={`italic text-tertiary flex flex-col gap-0 text-center justify-center py-4 border rounded-md ${bgBorder}`}
          style={bgStyle}
        >
          {isDefaultStatusFilter ? (
            <>
              <p className="font-bold"> No subscribers yet </p>
              <p>Start sharing your publication!</p>
              <ButtonPrimary
                className="mx-auto mt-2"
                onClick={(e) => {
                  e.preventDefault();
                  let rect = (
                    e.currentTarget as Element
                  )?.getBoundingClientRect();
                  navigator.clipboard.writeText(props.publicationShareUrl);
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
            </>
          ) : (
            <p className="font-bold">No subscribers match your filters!</p>
          )}
        </div>
      ) : (
        <div className={`rounded-md ${bgBorder}`} style={bgStyle}>
          <div className="subscriberListContent flex gap-2 flex-col ">
            {filtered
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .map((subscriber) => (
                <div key={subscriber.key}>
                  <SubscriberListItem
                    handle={subscriber.handle}
                    did={subscriber.did}
                    email={subscriber.email}
                    createdAt={subscriber.created_at}
                    status={subscriber.status}
                  />
                  <hr className="border-border-light mt-2 last:hidden" />
                </div>
              ))}
          </div>
        </div>
      )}
    </DashboardPageLayout>
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
        {(props.handle || props.did) && (
          <a
            target="_blank"
            href={`https://bsky.app/profile/${props.did}`}
            className={`${contactClassName} ${props.status === "subscribed" ? subscribedClassName : props.status === "unconfirmed" ? unconfirmedClassName : mutedClassName}`}
          >
            <AtmosphereAccount className="text-tertiary shrink-0" />
            <div className="truncate min-w-0">{props.handle ?? props.did}</div>
          </a>
        )}
        {(props.handle || props.did) && props.email && (
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

const SubscriberStatusFilter = () => {
  let { subscriberStatus } = useDashboardState();
  let setState = useSetDashboardState();
  let count = Object.values(subscriberStatus).filter(Boolean).length;

  return (
    <Popover
      className="text-sm px-2! py-1!"
      trigger={
        <div className="text-sm text-tertiary">
          Filters {count > 0 && `(${count})`}
        </div>
      }
    >
      <Checkbox
        small
        checked={subscriberStatus.subscribed}
        onChange={(e) =>
          setState({
            subscriberStatus: {
              ...subscriberStatus,
              subscribed: !!e.target.checked,
            },
          })
        }
      >
        Subscribed
      </Checkbox>
      <Checkbox
        small
        checked={subscriberStatus.unconfirmed}
        onChange={(e) =>
          setState({
            subscriberStatus: {
              ...subscriberStatus,
              unconfirmed: !!e.target.checked,
            },
          })
        }
      >
        Unconfirmed
      </Checkbox>
      <Checkbox
        small
        checked={subscriberStatus.unsubscribed}
        onChange={(e) =>
          setState({
            subscriberStatus: {
              ...subscriberStatus,
              unsubscribed: !!e.target.checked,
            },
          })
        }
      >
        Unsubscribed
      </Checkbox>
    </Popover>
  );
};
