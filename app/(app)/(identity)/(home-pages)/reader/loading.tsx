import { FeedContentSkeleton } from "components/PageLayouts/DashboardSkeleton";

// The reader pages already suspend their feed behind FeedSkeleton, so use the
// same skeleton here rather than the shared spinner — otherwise a cold
// navigation flashes spinner → skeleton → posts.
export default function Loading() {
  return <FeedContentSkeleton />;
}
