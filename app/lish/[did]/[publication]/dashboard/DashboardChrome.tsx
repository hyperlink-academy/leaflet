"use client";

import { Actions } from "./Actions";
import { DashboardShell } from "components/PageLayouts/DashboardShell";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { useCanSeePro } from "src/hooks/useEntitlement";
import { PubIcon } from "components/ActionBar/Publications";
import { PageTitle } from "components/ActionBar/DesktopNavigation";
import { SettingsSmall } from "components/Icons/SettingsSmall";
import {
  PublicationSWRDataProvider,
} from "./PublicationSWRProvider";
import type { GetPublicationDataReturnType } from "app/api/rpc/[command]/get_publication_data";
import { PublicationThemeProviderDashboard } from "components/ThemeManager/PublicationThemeProvider";

export function DashboardChrome(props: {
  publication_did: string;
  publication_rkey: string;
  publication_data: GetPublicationDataReturnType["result"];
  pubUri: string;
  record: NormalizedPublication;
  routeDid: string;
  routePublication: string;
  children: React.ReactNode;
}) {
  let canSeePro = useCanSeePro();
  let baseHref = `/lish/${props.routeDid}/${props.routePublication}/dashboard`;

  return (
    <PublicationSWRDataProvider
      publication_did={props.publication_did}
      publication_rkey={props.publication_rkey}
      publication_data={props.publication_data}
    >
      <PublicationThemeProviderDashboard>
        <DashboardShell
          id={props.pubUri}
          publication={props.pubUri}
          pageTitle={
            <PageTitle
              pageTitle={props.record.name}
              icon={
                <PubIcon small uri={props.pubUri} record={props.record} />
              }
            />
          }
          actions={<Actions publication={props.pubUri} />}
          tabs={{
            Drafts: { href: baseHref },
            Posts: { href: `${baseHref}/posts` },
            Subs: { href: `${baseHref}/subs` },
            ...(canSeePro
              ? { Analytics: { href: `${baseHref}/analytics` } }
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
