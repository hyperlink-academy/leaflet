import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { getIdentityData } from "actions/getIdentityData";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { LoginModal } from "components/LoginButton";
import { AtUri } from "@atproto/syntax";
import { PublicationThemeProviderDashboard } from "components/ThemeManager/PublicationThemeProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { PublicationSWRDataProvider } from "../../dashboard/PublicationSWRProvider";
import { PublicationPagesNav } from "./PublicationPagesNav";
import { PublicationEditHeader } from "./PublicationEditHeader";
import { PublicationHeader } from "../../PublicationHeader";
import { PublicationStickyHeader } from "../../PublicationStickyHeader";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string }>;
}): Promise<Metadata> {
  let did = decodeURIComponent((await props.params).did);
  if (!did) return { title: "Publication 404" };

  let { result: publication_data } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent((await props.params).publication),
    },
    { supabase: supabaseServerClient },
  );
  let { publication } = publication_data;
  const record = normalizePublicationRecord(publication?.record);
  if (!publication) return { title: "404 Publication" };
  return { title: `Edit Pages — ${record?.name || "Untitled Publication"}` };
}

export default async function PublicationEditLayout(props: {
  children: React.ReactNode;
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) {
    return (
      <NotFoundLayout>
        <p>
          Looks like you&apos;re not logged in.{" "}
          <LoginModal
            redirectRoute={`/lish/${params.did}/${params.publication}/dashboard`}
            trigger={
              <div className="text-accent-contrast font-bold">Log in here</div>
            }
          />
          !
        </p>
      </NotFoundLayout>
    );
  }

  let did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;

  let { result: publication_data } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent(params.publication),
    },
    { supabase: supabaseServerClient },
  );
  let { publication } = publication_data;
  const record = normalizePublicationRecord(publication?.record);

  if (
    !publication ||
    identity.atp_did !== publication.identity_did ||
    !record
  ) {
    return <PubNotFound />;
  }

  let uri = new AtUri(publication.uri);
  const iconUrl = record?.icon ? blobRefToSrc(record.icon.ref, did) : undefined;

  return (
    <PublicationSWRDataProvider
      publication_did={uri.host}
      publication_rkey={uri.rkey}
      publication_data={publication_data}
    >
      <PublicationThemeProviderDashboard>
        <div className="flex flex-col h-full w-full bg-accent-1">
          <PublicationEditHeader
            did={params.did}
            publicationName={params.publication}
          />
          <div className="pubWrapper flex flex-col grow min-h-0 bg-bg-page rounded-t-lg overflow-hidden">
            <PublicationStickyHeader
              sticky={false}
              scrollContainerSelector=".pageScrollWrapper"
            >
              <PublicationHeader
                variant="inline"
                iconUrl={iconUrl}
                publicationName={publication.name}
                description={record?.description}
              />
            </PublicationStickyHeader>
            <PublicationPagesNav
              did={params.did}
              publicationName={params.publication}
            />
            <div className="grow min-h-0 flex flex-col">{props.children}</div>
          </div>
        </div>
      </PublicationThemeProviderDashboard>
    </PublicationSWRDataProvider>
  );
}

const PubNotFound = () => {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can&apos;t find this publication!</p>
    </NotFoundLayout>
  );
};
