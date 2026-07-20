import { headers } from "next/headers";
import { Suspense } from "react";
import { IdentityProviderServer } from "components/IdentityProviderServer";
import { RequestHeadersProvider } from "components/Providers/RequestHeadersProvider";
import { RouteUIStateManager } from "components/RouteUIStateManger";
import { SubscriptionSuccessModal } from "components/SubscriptionSuccessModal";
import { SubscribeConfirmationModal } from "components/Subscribe/SubscribeConfirmationModal";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let headersList = await headers();
  let ipLocation = headersList.get("X-Vercel-IP-Country");
  let acceptLanguage = headersList.get("accept-language");
  let ipTimezone = headersList.get("X-Vercel-IP-Timezone");
  return (
    <IdentityProviderServer>
      <RequestHeadersProvider
        country={ipLocation}
        language={acceptLanguage}
        timezone={ipTimezone}
      >
        {children}
        <Suspense>
          <SubscriptionSuccessModal />
          <SubscribeConfirmationModal />
        </Suspense>
        <RouteUIStateManager />
      </RequestHeadersProvider>
    </IdentityProviderServer>
  );
}
