import { getIdentityData } from "actions/getIdentityData";
import { getReaderFeed } from "./getReaderFeed";
import { getHotFeed } from "./getHotFeed";
import { InboxContent } from "./InboxContent";
import { GlobalContent } from "./GlobalContent";
import { ReaderLayout } from "./ReaderLayout";

export default async function Reader() {
  let identityData = await getIdentityData();
  return (
    <ReaderLayout
      defaultTab={!identityData?.atp_did ? "Trending" : "Inbox"}
      readerFeedPromise={getReaderFeed()}
      hotFeedPromise={getHotFeed()}
    />
  );
}
