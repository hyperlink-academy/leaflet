"use client";
import { useMemo } from "react";
import useSWR from "swr";
import { AtUri } from "@atproto/api";
import { useDocument } from "contexts/DocumentContext";
import { useClientSearchParams } from "src/hooks/useClientSearchParams";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { prevNextAround } from "src/utils/prevNextPosts";
import {
  postsListFilterFromSearch,
  postsListFilterSearch,
} from "src/utils/postsListPagination";
import { getFilteredPrevNextPosts } from "./getFilteredPrevNextPosts";

type PostRef = { uri: string; title: string; images?: string[] };

export type ResolvedPrevNext = {
  prev?: PostRef;
  next?: PostRef;
  first?: PostRef;
  last?: PostRef;
  prevPreload?: string;
  nextPreload?: string;
};

export function usePostPrevNext(): {
  prevNext: ResolvedPrevNext | undefined;
  hrefFor: (uri: string) => string;
  loading: boolean;
} {
  const { prevNext, publication, uri } = useDocument();
  const params = useClientSearchParams();
  const filterTags = useMemo(() => postsListFilterFromSearch(params), [params]);
  const filtering = !!publication && filterTags.length > 0;

  const { data: filteredRun } = useSWR(
    filtering ? ["filtered-prev-next", publication.uri, ...filterTags] : null,
    () => getFilteredPrevNextPosts(publication!.uri, filterTags),
  );

  return useMemo(() => {
    const base = publication ? getPublicationURL(publication) : undefined;
    const href = (search: string) => (postUri: string) =>
      base && postUri
        ? `${base}/${new AtUri(postUri).rkey}${search}`
        : "leaflet.pub/not-found";
    const unfiltered = { prevNext, hrefFor: href(""), loading: false };

    if (!filtering) return unfiltered;
    if (!filteredRun)
      return { prevNext: undefined, hrefFor: href(""), loading: true };
    const around = uri ? prevNextAround(filteredRun, uri) : undefined;
    if (!around) return unfiltered;
    return {
      prevNext: {
        prev: around.prev,
        next: around.next,
        first: around.first,
        last: around.last,
        prevPreload: around.prevPreload?.uri,
        nextPreload: around.nextPreload?.uri,
      },
      hrefFor: href(postsListFilterSearch(filterTags)),
      loading: false,
    };
  }, [prevNext, publication, uri, filtering, filteredRun, filterTags]);
}
