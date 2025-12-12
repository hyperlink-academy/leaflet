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

  // Use raw SQL query to extract and aggregate tags
  const { data, error } = await supabaseServerClient.rpc("search_tags", {
    search_query: searchQuery,
  });

  if (error) {
    console.error("Error searching tags:", error);
    return null;
  }

  return data;
}
