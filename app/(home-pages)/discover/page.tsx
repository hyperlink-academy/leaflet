import { supabaseServerClient } from "supabase/serverClient";
import Link from "next/link";
import { SortedPublicationList } from "./SortedPublicationList";
import { Metadata } from "next";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";

export type PublicationsList = Awaited<ReturnType<typeof getPublications>>;
async function getPublications() {
  let { data: publications, error } = await supabaseServerClient
    .from("publications")
    .select(
      "*, documents_in_publications(*, documents(*)), publication_subscriptions(count)",
    )
    .or(
      "record->preferences->showInDiscover.is.null,record->preferences->>showInDiscover.eq.true",
    )
    .order("indexed_at", {
      referencedTable: "documents_in_publications",
      ascending: false,
    })
    .limit(1, { referencedTable: "documents_in_publications" });
  return publications;
}

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
  let publications = await getPublications();

  return (
    <div className="max-w-prose mx-auto w-full">
      <div className="discoverHeader flex flex-col items-center text-center pt-2 px-4">
        <h1>Discover</h1>
        <p className="text-lg text-secondary italic mb-2">
          Explore publications on Leaflet ✨ Or{" "}
          <Link href="/lish/createPub">make your own</Link>!
        </p>
      </div>
      <SortedPublicationList publications={publications} order={props.order} />
    </div>
  );
};
