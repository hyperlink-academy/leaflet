import { cookies } from "next/headers";
import HomePage from "./home/page";
import { getReaderFeed } from "./reader/getReaderFeed";
import { getHotFeed } from "./reader/getHotFeed";
import { ReaderLayout } from "./reader/ReaderLayout";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasAuth =
    cookieStore.has("auth_token") || cookieStore.has("external_auth_token");

  // if the user isn't logged in, leaflet.pub redirects to reader
  if (!hasAuth) {
    return (
      <ReaderLayout
        defaultTab="Trending"
        readerFeedPromise={getReaderFeed()}
        hotFeedPromise={getHotFeed()}
      />
    );
  }

  const navState = cookieStore.get("nav-state")?.value;
  // if the user IS logged in and was last on reader, leaflet.pub redirects to reader
  if (navState === "reader") {
    return (
      <ReaderLayout
        defaultTab="Inbox"
        readerFeedPromise={getReaderFeed()}
        hotFeedPromise={getHotFeed()}
      />
    );
  }
  // else redirect to writer home
  return <HomePage />;
}
