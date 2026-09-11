import { FeedSkeleton } from "app/(app)/(identity)/(home-pages)/reader/FeedSkeleton";
import { DashboardLoading } from "./DashboardLoading";

const pulse = "animate-pulse motion-reduce:animate-none";

function SidebarSkeleton() {
  return (
    <div className="hidden sm:flex pwa-padding pwa-padding-bottom sm:h-auto sm:items-stretch">
      <div
        className={`actionSidebar sm:my-6 sm:ml-0 w-56 frosted-container p-[6px] flex flex-col gap-0.5 border rounded-md ${pulse}`}
      >
        <div className="h-5 w-2/3 rounded bg-border-light" />
        <hr className="border-border-light my-2" />
        <div className="h-7 rounded bg-border-light" />
        <div className="h-7 rounded bg-border-light" />
        <div className="h-7 rounded bg-border-light" />
        <div className="flex-1" />
        <div className="h-7 rounded bg-border-light" />
        <div className="h-7 rounded bg-border-light" />
        <div className="h-7 rounded bg-border-light" />
      </div>
    </div>
  );
}

// Matches MobileNavigation's geometry (fixed pill, position: fixed so it
// reserves no flow space) so the trigger doesn't visibly pop in once the real
// shell mounts.
function MobileHeaderSkeleton() {
  return (
    <div
      className="sm:hidden mobilePageFooter pwa-padding-x z-20 fixed left-0 bottom-4 right-0"
      style={{ bottom: "var(--safe-padding-bottom)" }}
    >
      <div className="px-5">
        <div
          className={`h-9 rounded-lg border border-border-light bg-bg-page ${pulse}`}
        />
      </div>
    </div>
  );
}

function GridContentSkeleton() {
  return (
    <div className="dashboardPageContent relative w-full h-full flex flex-col gap-2 pt-3 pb-[calc(var(--safe-padding-bottom)+64px)] px-3 sm:pt-6 sm:pb-6 sm:pl-8 sm:pr-4 overflow-y-auto">
      <div
        className={`hidden sm:block h-9 w-48 rounded bg-border-light ${pulse}`}
      />
      <div
        className={`grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-4 gap-x-4 sm:gap-x-6 sm:gap-y-5 grow ${pulse}`}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="relative flex flex-col gap-1 p-1 h-52 w-full block-border border-border-light"
          >
            <div className="grow rounded bg-border-light" />
            <div className="h-4 w-2/3 rounded bg-border-light shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedContentSkeleton() {
  return (
    <div className="w-full h-full pt-3 px-3 sm:pt-6 sm:pl-8 sm:pr-4">
      <FeedSkeleton />
    </div>
  );
}

export function DashboardSkeleton(props: {
  variant: "grid" | "feed" | "plain";
}) {
  return (
    <div className="dashboard pwa-padding relative max-w-(--breakpoint-lg) w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6">
      <SidebarSkeleton />
      {props.variant === "grid" ? (
        <GridContentSkeleton />
      ) : props.variant === "feed" ? (
        <FeedContentSkeleton />
      ) : (
        <DashboardLoading />
      )}
      <MobileHeaderSkeleton />
    </div>
  );
}
