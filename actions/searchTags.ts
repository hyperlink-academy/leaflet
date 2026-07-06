"use server";
import { supabaseServerClient } from "supabase/serverClient";

export type TagSearchResult = {
  name: string;
  document_count: number;
};

export async function searchTags(
  query: string,
): Promise<TagSearchResult[] | null> {
  const searchQuery = query.trim().toLowerCase();

  // 1-2 character patterns can't use the trigram index (and the UI only
  // shows results from 3 characters), so don't hit the database for them.
  if (searchQuery.length > 0 && searchQuery.length < 3) {
    return [];
  }

  const { data, error } = await supabaseServerClient.rpc("search_tags", {
    search_query: searchQuery,
  });

  if (error) {
    console.error("Error searching tags:", error);
    return null;
  }

  return data;
}
