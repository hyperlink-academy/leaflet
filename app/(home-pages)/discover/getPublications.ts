"use server";

import { supabaseServerClient } from "supabase/serverClient";

export type Cursor = {
  indexed_at?: string;
  count?: number;
  uri: string;
};

export type Publication = Awaited<
  ReturnType<typeof getPublications>
>["publications"][number];

export async function getPublications(
  order: "recentlyUpdated" | "popular" = "recentlyUpdated",
  cursor?: Cursor | null,
): Promise<{ publications: any[]; nextCursor: Cursor | null }> {
  const limit = 25;

  // Fetch all publications with their most recent document
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
    console.error("Error fetching publications:", error);
    return { publications: [], nextCursor: null };
  }

  // Filter out publications without documents
  const allPubs = (publications || []).filter(
    (pub) => pub.documents_in_publications.length > 0,
  );

  // Sort on the server
  allPubs.sort((a, b) => {
    if (order === "popular") {
      const aCount = a.publication_subscriptions[0]?.count || 0;
      const bCount = b.publication_subscriptions[0]?.count || 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      // Secondary sort by uri for stability
      return b.uri.localeCompare(a.uri);
    } else {
      // recentlyUpdated
      const aDate = new Date(
        a.documents_in_publications[0]?.indexed_at || 0,
      ).getTime();
      const bDate = new Date(
        b.documents_in_publications[0]?.indexed_at || 0,
      ).getTime();
      if (bDate !== aDate) {
        return bDate - aDate;
      }
      // Secondary sort by uri for stability
      return b.uri.localeCompare(a.uri);
    }
  });

  // Find cursor position and slice
  let startIndex = 0;
  if (cursor) {
    startIndex = allPubs.findIndex((pub) => {
      if (order === "popular") {
        const pubCount = pub.publication_subscriptions[0]?.count || 0;
        // Find first pub after cursor
        return (
          pubCount < (cursor.count || 0) ||
          (pubCount === cursor.count && pub.uri < cursor.uri)
        );
      } else {
        const pubDate = pub.documents_in_publications[0]?.indexed_at || "";
        // Find first pub after cursor
        return (
          pubDate < (cursor.indexed_at || "") ||
          (pubDate === cursor.indexed_at && pub.uri < cursor.uri)
        );
      }
    });
    // If not found, we're at the end
    if (startIndex === -1) {
      return { publications: [], nextCursor: null };
    }
  }

  // Get the page
  const page = allPubs.slice(startIndex, startIndex + limit);

  // Create next cursor
  const nextCursor =
    page.length === limit && startIndex + limit < allPubs.length
      ? order === "recentlyUpdated"
        ? {
            indexed_at: page[page.length - 1].documents_in_publications[0]?.indexed_at,
            uri: page[page.length - 1].uri,
          }
        : {
            count: page[page.length - 1].publication_subscriptions[0]?.count || 0,
            uri: page[page.length - 1].uri,
          }
      : null;

  return {
    publications: page,
    nextCursor,
  };
}
