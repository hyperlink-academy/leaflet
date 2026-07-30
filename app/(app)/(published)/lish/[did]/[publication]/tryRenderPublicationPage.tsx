import {
  PublicationPageRenderer,
  type PublicationPageRecord,
} from "./[rkey]/PublicationPageRenderer";
import { findPublishedPage } from "src/utils/publishedPageMetadata";

type RendererProps = Parameters<typeof PublicationPageRenderer>[0];

type PublicationForRenderer = Omit<
  RendererProps["publication"],
  "publication_pages"
> & {
  publication_pages?: {
    id: number;
    path: string | null;
    title: string;
    record: unknown;
    record_uri: string | null;
    sort_order: string;
  }[];
};

export function tryRenderPublicationPage({
  did,
  publication,
  path,
}: {
  did: string;
  publication: PublicationForRenderer;
  path: string;
}) {
  const match = findPublishedPage(publication.publication_pages, path);
  if (!match || !match.record_uri || !match.record) return null;
  const pageRecord = match.record as unknown as PublicationPageRecord;
  return (
    <PublicationPageRenderer
      did={did}
      page={{
        id: match.id,
        path: match.path!,
        title: match.title,
        record: pageRecord,
      }}
      publication={publication}
    />
  );
}
