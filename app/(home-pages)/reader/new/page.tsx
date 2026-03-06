import { getNewFeed } from "../getNewFeed";
import { NewContent } from "../NewContent";

export default async function NewPage() {
  const feedPromise = getNewFeed();
  return <NewContent promise={feedPromise} />;
}
