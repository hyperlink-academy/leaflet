import {
  BaseThemeProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import SortButtons from "./SortButtons";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { PubLeafletPublication } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AtUri } from "@atproto/syntax";
import Link from "next/link";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { PubListing } from "./PubListing";

export default async function Discover(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let order = ((await props.searchParams).order as string) || "recentlyUpdated";
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
  if (error) {
    return <pre>{JSON.stringify(error, null, 2)}</pre>;
  }

  return (
    <div className="bg-[#FDFCFA] w-full h-full overflow-scroll">
      <div className="max-w-prose mx-auto sm:py-6 py-4 ">
        <div className="discoverHeader flex flex-col ">
          <h1>Discover</h1>
          <p className="text-lg text-secondary italic mb-1">
            Check out all the coolest publications on Leaflet! Or{" "}
            <Link href="/lish/createPub">create your own!</Link>.
          </p>
          <SortButtons order={order} />
        </div>
        <div className="discoverPubList flex flex-col gap-3 pt-6">
          {publications
            ?.filter((pub) => pub.documents_in_publications.length > 0)
            ?.sort((a, b) => {
              if (order === "popular") {
                console.log("sorting by popularity");
                return (
                  b.publication_subscriptions[0].count -
                  a.publication_subscriptions[0].count
                );
              }
              const aDate = new Date(
                a.documents_in_publications[0]?.indexed_at || 0,
              );
              const bDate = new Date(
                b.documents_in_publications[0]?.indexed_at || 0,
              );
              return bDate.getTime() - aDate.getTime();
            })
            .map((pub) => <PubListing key={pub.uri} {...pub} />)}
        </div>
      </div>
    </div>
  );
}
