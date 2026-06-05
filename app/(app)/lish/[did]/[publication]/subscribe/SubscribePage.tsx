import { supabaseServerClient } from "supabase/serverClient";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
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
  if (!did || !identifier) return <PubNotFound />;

  const { data: publications } = await supabaseServerClient
    .from("publications")
    .select(
      `*,
      publication_subscriptions(*),
      publication_newsletter_settings(enabled)`,
    )
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, identifier))
    .order("uri", { ascending: false })
    .limit(1);

  const publication = publications?.[0];
  const record = normalizePublicationRecord(publication?.record);

  if (!publication || !record) return <PubNotFound />;

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

export const PubNotFound = () => {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can't find this publication!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
};
