import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { getIdentityData } from "actions/getIdentityData";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { LoginModal } from "components/LoginButton";
import { AtUri } from "@atproto/syntax";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { SettingsSmall } from "components/Icons/SettingsSmall";
import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { PublicationThemeProviderDashboard } from "components/ThemeManager/PublicationThemeProvider";
import { Actions } from "./Actions";
import { EditPagesNavLink } from "./EditPagesNavLink";
import { PublicationSWRDataProvider } from "./PublicationSWRProvider";
import { AnalyticsSmall } from "components/Icons/AnalyticsSmall";
import { SubscribersSmall } from "components/Icons/SubscribersSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import { ArchiveSmall } from "components/Icons/ArchiveSmall";

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
  return { title: record?.name || "Untitled Publication" };
}

export default async function PublicationDashboardLayout(props: {
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
        <p>
          If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
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

  if (!publication || !record) {
    return <PubNotFound />;
  }

  let isOwner = identity.atp_did === publication.identity_did;
  let isConfirmedContributor =
    !isOwner &&
    (publication.publication_contributors ?? []).some(
      (c) => c.contributor_did === identity.atp_did && c.confirmed,
    );
  if (!isOwner && !isConfirmedContributor) {
    return <PubNotFound />;
  }

  let uri = new AtUri(publication.uri);
  let baseHref = `/lish/${params.did}/${params.publication}/dashboard`;

  return (
    <PublicationSWRDataProvider
      publication_did={uri.host}
      publication_rkey={uri.rkey}
      publication_data={publication_data}
    >
      <PublicationThemeProviderDashboard>
        <DashboardShell
          id={publication.uri}
          publication={publication.uri}
          pageTitle={<PageTitle pageTitle={record.name} showBackButton />}
          actions={
            <>
              <Actions publication={publication.uri} />
              {isOwner && (
                <EditPagesNavLink
                  publication={publication.uri}
                  did={uri.host}
                  publicationName={uri.rkey}
                />
              )}
            </>
          }
          tabs={{
            Drafts: { href: baseHref, icon: <ArchiveSmall /> },
            Posts: { href: `${baseHref}/posts`, icon: <PublishSmall /> },
            ...(isOwner
              ? {
                  Subs: {
                    href: `${baseHref}/subs`,
                    icon: <SubscribersSmall />,
                  },
                  Analytics: {
                    href: `${baseHref}/analytics`,
                    icon: <AnalyticsSmall />,
                  },
                }
              : {}),
            Settings: {
              href: `${baseHref}/settings`,
              icon: <SettingsSmall />,
            },
          }}
        >
          {props.children}
        </DashboardShell>
      </PublicationThemeProviderDashboard>
    </PublicationSWRDataProvider>
  );
}

const PubNotFound = () => {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can&apos;t find this publication!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
};
