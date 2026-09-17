import useSWR, { preload } from "swr";
import { getReaderPost } from "actions/reader/getReaderPost";

const readerPostKey = (document_uri: string) =>
  ["reader_post", document_uri] as const;

export function prefetchReaderPost(document_uri: string) {
  preload(readerPostKey(document_uri), () => getReaderPost(document_uri));
}

export function useReaderPost(document_uri: string | null) {
  return useSWR(
    document_uri ? readerPostKey(document_uri) : null,
    () => getReaderPost(document_uri!),
    { revalidateOnFocus: false, revalidateIfStale: false },
  );
}
