import { Suspense } from "react";
import { getHotFeed } from "../getHotFeed";
import { GlobalContent } from "../GlobalContent";
import { FeedSkeleton } from "../FeedSkeleton";

export default async function HotPage() {
  const feedPromise = getHotFeed();
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <GlobalContent promise={feedPromise} />
    </Suspense>
  );
}
