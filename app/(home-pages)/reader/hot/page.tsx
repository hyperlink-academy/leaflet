import { getHotFeed } from "../getHotFeed";
import { GlobalContent } from "../GlobalContent";

export default async function HotPage() {
  const feedPromise = getHotFeed();
  return <GlobalContent promise={feedPromise} />;
}
