import { headers } from "next/headers";
import { Suspense } from "react";
import { IdentityProviderServer } from "components/IdentityProviderServer";
import { RequestHeadersProvider } from "components/Providers/RequestHeadersProvider";
import { RouteUIStateManager } from "components/RouteUIStateManger";
import { SubscriptionSuccessModal } from "components/SubscriptionSuccessModal";
import { SubscribeConfirmationModal } from "components/Subscribe/SubscribeConfirmationModal";
import { RecommendConfirmationToast } from "components/Interactions/RecommendConfirmationToast";

// Identity-bearing surfaces (dashboard, editor, account flows): rendered
// per-request with the viewer's identity so chrome and theme are correct on
// the first frame. Published pages live in the (published) sibling group,
// which must stay free of request-coupled reads.
export default async function IdentityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let headersList = await headers();
  let acceptLanguage = headersList.get("accept-language");
  let ipTimezone = headersList.get("X-Vercel-IP-Timezone");
  return (
    <IdentityProviderServer>
      <RequestHeadersProvider language={acceptLanguage} timezone={ipTimezone}>
        {children}
        <Suspense>
          <SubscriptionSuccessModal />
          <SubscribeConfirmationModal />
          <RecommendConfirmationToast />
        </Suspense>
        <RouteUIStateManager />
      </RequestHeadersProvider>
    </IdentityProviderServer>
  );
}
