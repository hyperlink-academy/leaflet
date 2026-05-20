import {
  PublicationPageRenderer,
  type PublicationPageRecord,
} from "./[rkey]/PublicationPageRenderer";

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
  const matchingPage = publication.publication_pages?.find(
    (p) => p.path === path && p.record_uri && p.record,
  );
  if (!matchingPage || !matchingPage.record) return null;
  const pageRecord =
    matchingPage.record as unknown as PublicationPageRecord;
  return (
    <PublicationPageRenderer
      did={did}
      page={{
        id: matchingPage.id,
        path: matchingPage.path ?? "/",
        title: matchingPage.title,
        record: pageRecord,
      }}
      publication={publication}
    />
  );
}
