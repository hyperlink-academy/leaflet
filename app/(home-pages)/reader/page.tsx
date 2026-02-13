import { getIdentityData } from "actions/getIdentityData";
import { getReaderFeed } from "./getReaderFeed";
import { getHotFeed } from "./getHotFeed";
import { InboxContent } from "./InboxContent";
import { GlobalContent } from "./GlobalContent";

export default async function Reader() {
  let identityData = await getIdentityData();
  if (!identityData?.atp_did) {
    const feedPromise = getHotFeed();
    return <GlobalContent promise={feedPromise} />;
  }

  const feedPromise = getReaderFeed();
  return <InboxContent promise={feedPromise} />;
}
