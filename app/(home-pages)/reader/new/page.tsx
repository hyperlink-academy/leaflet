import { Suspense } from "react";
import { getNewFeed } from "../getNewFeed";
import { NewContent } from "../NewContent";
import { FeedSkeleton } from "../FeedSkeleton";

export default async function NewPage() {
  const feedPromise = getNewFeed();
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <NewContent promise={feedPromise} />
    </Suspense>
  );
}
