"use client";

import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { Popover } from "components/Popover";
import { Checkbox } from "components/Checkbox";
import {
  useDashboardState,
  useSetDashboardState,
} from "components/PageLayouts/dashboardState";
import { usePublicationData } from "./PublicationSWRProvider";
import { useMergedSubscribers } from "./PublicationSubscribers";

export function SubsPageShell({ children }: { children: React.ReactNode }) {
  let { data } = usePublicationData();
  let pubUri = data?.publication?.uri || "";
  let subscribers = useMergedSubscribers();
  let count = subscribers?.length ?? 0;

  return (
    <DashboardPageLayout
      scrollKey={`dashboard-${pubUri}-Subs`}
      pageTitle="Subscribers"
      mobileActions={<SubscriberStatusFilter />}
      publication={pubUri}
      showHeader={true}
      controls={
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="font-bold text-secondary px-1">
            {count} Subscriber{count !== 1 && "s"}
          </div>
          <SubscriberStatusFilter />
        </div>
      }
    >
      {children}
    </DashboardPageLayout>
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
