"use client";
import { Fragment } from "react";
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
import { CheckboxMenuItem, Menu, MenuSeparator } from "components/Menu";

export type SubscriberStatus = "subscribed" | "unconfirmed" | "unsubscribed";

// id is null when the member's tier row was deleted (memberships keep the
// tier FK ON DELETE SET NULL); they still count as a member, just untierable.
export type MemberTier = { id: string | null; name: string };

export type Tier = { id: string; name: string; is_free: boolean };

export type MergedSubscriber = {
  key: string;
  did: string | undefined;
  handle: string | undefined;
  email: string | undefined;
  created_at: string;
  status: SubscriberStatus;
  memberTier?: MemberTier;
};

export function PublicationSubscribers(props: {
  subscribers: MergedSubscriber[];
  publicationShareUrl: string;
  publicationUri: string;
  showPageBackground: boolean;
  membershipsEnabled: boolean;
  tiers: Tier[];
}) {
  let smoker = useSmoker();
  let { subscriberStatus } = useDashboardState();
  let { membersOnly, selected, freeSelected, selectedPaidTiers, tierNarrowed } =
    useTierFilter(props.tiers);
  let filtered = props.subscribers.filter((s) => {
    if (!subscriberStatus[s.status]) return false;
    if (!membersOnly && !freeSelected) return true;
    // Joining the free tier is a plain subscription with no membership row, so
    // the free tier is everyone without a paid one.
    if (!s.memberTier) return freeSelected;
    if (!membersOnly) return false;
    return (
      !tierNarrowed ||
      (!!s.memberTier.id && selectedPaidTiers.includes(s.memberTier.id))
    );
  });

  let activeStatuses = (
    Object.keys(subscriberStatus) as SubscriberStatus[]
  ).filter((k) => subscriberStatus[k]);
  let isDefaultStatusFilter =
    activeStatuses.length === 1 &&
    activeStatuses[0] === "subscribed" &&
    !membersOnly &&
    selected.length === 0;

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
      mobileActions={
        <SubscriberStatusFilter
          membershipsEnabled={props.membershipsEnabled}
          tiers={props.tiers}
        />
      }
      publication={props.publicationUri}
      showHeader={true}
      controls={
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="font-bold text-secondary px-1">
            {filtered.length} Subscriber{filtered.length !== 1 && "s"}
          </div>
          <SubscriberStatusFilter
            membershipsEnabled={props.membershipsEnabled}
            tiers={props.tiers}
          />
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
                <Fragment key={subscriber.key}>
                  <SubscriberListItem
                    handle={subscriber.handle}
                    did={subscriber.did}
                    email={subscriber.email}
                    createdAt={subscriber.created_at}
                    status={subscriber.status}
                    memberTier={subscriber.memberTier}
                  />
                  <hr className="border-border-light last:hidden" />
                </Fragment>
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
  memberTier?: MemberTier;
}) => {
  let contactClassName =
    "subscriber flex flex-row gap-2 items-center  px-1 text-sm w-full max-w-fit no-underline!  hover:text-accent-contrast ";
  let subscribedClassName = " text-secondary";
  let mutedClassName = "text-tertiary line-through";
  let unconfirmedClassName = "animate-pulse text-tertiary";

  return (
    <div className="flex flex-row justify-between gap-2 w-full items-start">
      <div className="flex flex-col grow min-w-0 w-full">
        {(props.handle || props.did) && (
          <a
            target="_blank"
            href={`https://bsky.app/profile/${props.did}`}
            className={`${contactClassName}`}
          >
            <AtmosphereAccount className="text-tertiary shrink-0" />
            <div
              className={`truncate min-w-0  ${props.status === "subscribed" ? subscribedClassName : props.status === "unconfirmed" ? unconfirmedClassName : mutedClassName}`}
            >
              {props.handle ?? props.did}
            </div>
          </a>
        )}
        {(props.handle || props.did) && props.email && (
          <Separator classname="sm:block hidden" />
        )}
        {props.email && (
          <a
            target="_blank"
            href={`mailto:${props.email}`}
            className={`${contactClassName} `}
          >
            <EmailTiny className="text-tertiary shrink-0" />{" "}
            <div
              className={`truncate min-w-0 ${props.status === "subscribed" ? subscribedClassName : props.status === "unconfirmed" ? unconfirmedClassName : mutedClassName}`}
            >
              {props.email}
            </div>
          </a>
        )}
      </div>
      <div className="flex flex-row gap-2 shrink-0 items-center mt-0.5">
        {props.memberTier && (
          <span className="accent-container text-xs uppercase font-bold text-accent-contrast rounded-sm px-1 py-0.5 leading-none">
            {props.memberTier.name}
          </span>
        )}
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

const useTierFilter = (tiers: Tier[]) => {
  let { membersOnly, memberTiers } = useDashboardState();
  let selected = memberTiers.filter((id) => tiers.some((t) => t.id === id));
  let paidTiers = tiers.filter((t) => !t.is_free);
  let selectedPaidTiers = selected.filter((id) =>
    paidTiers.some((t) => t.id === id),
  );
  return {
    membersOnly,
    selected,
    paidTiers,
    selectedPaidTiers,
    freeSelected: tiers.some((t) => t.is_free && selected.includes(t.id)),
    tierNarrowed:
      selectedPaidTiers.length > 0 &&
      selectedPaidTiers.length < paidTiers.length,
  };
};

const SubscriberStatusFilter = (props: {
  membershipsEnabled: boolean;
  tiers: Tier[];
}) => {
  let { subscriberStatus, memberTiers } = useDashboardState();
  let setState = useSetDashboardState();
  let {
    membersOnly,
    selected,
    paidTiers,
    selectedPaidTiers,
    freeSelected,
    tierNarrowed,
  } = useTierFilter(props.tiers);

  let count =
    Object.values(subscriberStatus).filter(Boolean).length +
    (freeSelected ? 1 : 0) +
    (membersOnly ? (tierNarrowed ? selectedPaidTiers.length : 1) : 0);

  const setMemberTiers = (ids: string[]) =>
    setState({
      memberTiers: ids,
      // Paid stays on as long as any tier under it is, so unchecking the last
      // child unchecks the parent.
      membersOnly: paidTiers.some((t) => ids.includes(t.id)),
    });

  const statusCheckbox = (status: SubscriberStatus, label: string) => (
    <CheckboxMenuItem
      compact
      checked={subscriberStatus[status]}
      onSelect={(e) => {
        e.preventDefault();
        setState({
          subscriberStatus: {
            ...subscriberStatus,
            [status]: !subscriberStatus[status],
          },
        });
      }}
    >
      {label}
    </CheckboxMenuItem>
  );

  const tierCheckbox = (tier: Tier, className?: string) => (
    <CheckboxMenuItem
      key={tier.id}
      compact
      className={className}
      checked={selected.includes(tier.id)}
      onSelect={(e) => {
        e.preventDefault();
        let ids = selected.includes(tier.id)
          ? memberTiers.filter((id) => id !== tier.id)
          : [...memberTiers.filter((id) => id !== tier.id), tier.id];
        if (tier.is_free) return setState({ memberTiers: ids });
        setMemberTiers(ids);
      }}
    >
      <span className="truncate min-w-0">{tier.name}</span>
    </CheckboxMenuItem>
  );

  return (
    <Menu
      asChild
      align="end"
      className="text-sm max-w-(--radix-dropdown-menu-content-available-width)"
      trigger={
        <button type="button" className="text-sm text-tertiary">
          Filters {count > 0 && `(${count})`}
        </button>
      }
    >
      {statusCheckbox("subscribed", "Subscribed")}
      {statusCheckbox("unconfirmed", "Unconfirmed")}
      {statusCheckbox("unsubscribed", "Unsubscribed")}

      {props.membershipsEnabled && (
        <>
          <MenuSeparator />

          {props.tiers
            .filter((t) => t.is_free)
            .map((tier) => tierCheckbox(tier))}

          <CheckboxMenuItem
            compact
            checked={membersOnly && !tierNarrowed}
            indeterminate={membersOnly && tierNarrowed}
            onSelect={(e) => {
              e.preventDefault();
              let checked = !(membersOnly && !tierNarrowed);
              let withoutPaid = memberTiers.filter(
                (id) => !paidTiers.some((t) => t.id === id),
              );
              setState({
                // Set directly rather than derived from the tiers below: a
                // publication can have members with no paid tier left to check.
                membersOnly: checked,
                memberTiers: checked
                  ? [...withoutPaid, ...paidTiers.map((t) => t.id)]
                  : withoutPaid,
              });
            }}
          >
            Paid Members
          </CheckboxMenuItem>
          {props.tiers
            .filter((t) => !t.is_free)
            .map((tier) => tierCheckbox(tier, "pl-6!"))}
        </>
      )}
    </Menu>
  );
};
