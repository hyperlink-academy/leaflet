import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import SortButtons from "./SortButtons";
import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { PubLeafletPublication } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AtUri } from "@atproto/syntax";

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
            Check out all the coolest publications on Leaflet!
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
            .map((pub) => <PubListing2 key={pub.uri} {...pub} />)}
        </div>
      </div>
    </div>
  );
}

const PubListing = (props: {
  record: Json;
  uri: string;
  documents_in_publications: { indexed_at: string }[];
}) => {
  let record = props.record as PubLeafletPublication.Record;
  if (!record) return null;
  return (
    <>
      <div className="flex gap-2">
        <div
          style={{
            backgroundImage: record?.icon
              ? `url(${blobRefToSrc(record.icon?.ref, new AtUri(props.uri).host)})`
              : undefined,
          }}
          className="w-6 h-6 mt-0.5 rounded-full bg-test"
        />
        <div className="flex flex-col ">
          <h3>{record.name}</h3>
          <p className="text-secondary">{record.description}</p>
          <div className="flex gap-2 text-sm text-tertiary pt-2 items-center">
            Updated {timeAgo(props.documents_in_publications[0].indexed_at)}
          </div>
        </div>
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
};

const PubListing2 = (props: {
  record: Json;
  uri: string;
  documents_in_publications: {
    indexed_at: string;
    documents: { data: Json } | null;
  }[];
}) => {
  let record = props.record as PubLeafletPublication.Record;
  if (!record) return null;
  return (
    <a
      target="_blank"
      href={`https://${record.base_path}`}
      className="!no-underline flex flex-row gap-2 border border-border-light rounded-lg px-3 py-3 selected-outline hover:outline-accent-contrast hover:border-accent-contrast"
    >
      <div
        style={{
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundImage: record?.icon
            ? `url(${blobRefToSrc(record.icon?.ref, new AtUri(props.uri).host)})`
            : undefined,
        }}
        className="w-6 h-6 mt-0.5 rounded-full bg-test shrink-0"
      />
      <div className="flex flex-col ">
        <h3>{record.name}</h3>
        <p className="text-secondary">{record.description}</p>
        <div className="flex gap-1 items-center text-sm text-tertiary pt-2 ">
          <p>
            Updated {timeAgo(props.documents_in_publications[0].indexed_at)}
          </p>
        </div>
      </div>
    </a>
  );
};

function timeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else {
    return "just now";
  }
}
