import Link from "next/link";
import { SortedPublicationList } from "./SortedPublicationList";
import { Metadata } from "next";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { getPublications } from "./getPublications";

export const metadata: Metadata = {
  title: "Leaflet Discover",
  description: "Explore publications on Leaflet ✨ Or make your own!",
};

export default async function Discover(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let order = ((await props.searchParams).order as string) || "recentlyUpdated";

  return (
    <DashboardLayout
      id="discover"
      cardBorderHidden={false}
      currentPage="discover"
      defaultTab="default"
      actions={null}
      tabs={{
        default: {
          controls: null,
          content: <DiscoverContent order={order} />,
        },
      }}
    />
  );
}

const DiscoverContent = async (props: { order: string }) => {
  const orderValue =
    props.order === "popular" ? "popular" : "recentlyUpdated";
  let { publications, nextCursor } = await getPublications(orderValue);

  return (
    <div className="max-w-prose mx-auto w-full">
      <div className="discoverHeader flex flex-col items-center text-center pt-2 px-4">
        <h1>Discover</h1>
        <p className="text-lg text-secondary italic mb-2">
          Explore publications on Leaflet ✨ Or{" "}
          <Link href="/lish/createPub">make your own</Link>!
        </p>
      </div>
      <SortedPublicationList
        publications={publications}
        order={props.order}
        nextCursor={nextCursor}
      />
    </div>
  );
};
