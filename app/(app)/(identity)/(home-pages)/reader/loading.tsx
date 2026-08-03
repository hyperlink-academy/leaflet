import { FeedSkeleton } from "./FeedSkeleton";

// The reader pages already suspend their feed behind FeedSkeleton, so use the
// same skeleton here rather than the shared spinner — otherwise a cold
// navigation flashes spinner → skeleton → posts. Padding mirrors
// DashboardPageLayout's content box, which the page mounts a beat later.
export default function Loading() {
  return (
    <div className="w-full h-full pt-3 px-3 sm:pt-6 sm:pl-8 sm:pr-4">
      <FeedSkeleton />
    </div>
  );
}
