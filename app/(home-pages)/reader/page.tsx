import { Suspense } from "react";
import { getReaderFeed } from "./getReaderFeed";
import { InboxContent } from "./InboxContent";
import { FeedSkeleton } from "./FeedSkeleton";

export default async function Reader() {
  const feedPromise = getReaderFeed();
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <InboxContent promise={feedPromise} />
    </Suspense>
  );
}
