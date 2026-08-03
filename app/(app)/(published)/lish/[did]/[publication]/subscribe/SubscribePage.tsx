import { supabaseServerClient } from "supabase/serverClient";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { notFound } from "next/navigation";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { SubscribeCard } from "./SubscribeCard";

// Canonical subscribe page. Rendered directly at the publication route
// (/lish/[did]/[publication]/subscribe) and re-rendered at /subscribe/[did]/[rkey].
// `identifier` may be a publication name or an rkey — publicationNameOrUriFilter
// matches either.
export async function SubscribePage(props: {
  did: string;
  identifier: string;
}) {
  const { did, identifier } = props;
  if (!did || !identifier) notFound();

  const { data: publications } = await supabaseServerClient
    .from("publications")
    .select(
      `uri, record, identity_did,
      publication_newsletter_settings(enabled)`,
    )
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, identifier))
    .order("uri", { ascending: false })
    .limit(1);

  const publication = publications?.[0];
  const record = normalizePublicationRecord(publication?.record);

  if (!publication || !record) notFound();

  return (
    <PublicationThemeProvider
      record={record}
      pub_creator={publication.identity_did}
    >
      <PublicationBackgroundProvider
        record={record}
        pub_creator={publication.identity_did}
        className="min-h-screen"
      >
        <div className="w-full min-h-screen flex items-center justify-center">
          <SubscribeCard
            record={record}
            uri={publication.uri}
            newsletterMode={
              publication.publication_newsletter_settings?.enabled ?? false
            }
          />
        </div>
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}
