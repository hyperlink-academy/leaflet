import { getReaderFeed } from "./getReaderFeed";
import { InboxContent } from "./InboxContent";

export default async function Reader() {
  const feedPromise = getReaderFeed();
  return <InboxContent promise={feedPromise} />;
}
