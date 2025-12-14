import { Metadata } from "next";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { LinksFeed } from "./LinksFeed";
import { LinkSubmitForm } from "./LinkSubmitForm";
import { BskyImportForm } from "./BskyImportForm";
import { getIdentityData } from "actions/getIdentityData";

export const metadata: Metadata = {
  title: "Links - Leaflet",
  description: "Discover and share interesting links from the community",
};

export default async function LinksPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const feed = (searchParams.feed as string) || "all";
  const tag = searchParams.tag as string | undefined;
  const identity = await getIdentityData();

  return (
    <DashboardLayout
      id="links"
      cardBorderHidden={false}
      currentPage="links"
      defaultTab="feed"
      actions={
        identity ? (
          <div className="flex gap-2">
            <LinkSubmitForm />
            <BskyImportForm />
          </div>
        ) : null
      }
      tabs={{
        feed: {
          controls: null,
          content: <LinksContent feed={feed} tag={tag} isLoggedIn={!!identity} />,
        },
      }}
    />
  );
}

function LinksContent({
  feed,
  tag,
  isLoggedIn,
}: {
  feed: string;
  tag?: string;
  isLoggedIn: boolean;
}) {
  return (
    <div className="max-w-prose mx-auto w-full">
      <div className="linksHeader flex flex-col items-center text-center pt-2 px-4">
        <h1>Links</h1>
        <p className="text-lg text-secondary italic mb-2">
          Discover interesting links shared by the community
        </p>
      </div>
      <LinksFeed initialFeed={feed} initialTag={tag} isLoggedIn={isLoggedIn} />
    </div>
  );
}
