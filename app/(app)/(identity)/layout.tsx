import { headers } from "next/headers";
import { Suspense } from "react";
import { IdentityProviderServer } from "components/IdentityProviderServer";
import { FullPageLoading } from "components/PageLayouts/DashboardLoading";
import { RequestHeadersProvider } from "components/Providers/RequestHeadersProvider";
import { RouteUIStateManager } from "components/RouteUIStateManger";
import { SubscriptionSuccessModal } from "components/SubscriptionSuccessModal";
import { SubscribeConfirmationModal } from "components/Subscribe/SubscribeConfirmationModal";
import { RecommendConfirmationToast } from "components/Interactions/RecommendConfirmationToast";

// Identity-bearing surfaces (dashboard, editor, account flows): rendered
// per-request with the viewer's identity so chrome and theme are correct on
// the first frame. Published pages live in the (published) sibling group,
// which must stay free of request-coupled reads.
//
// The layout itself must stay synchronous, with the request-coupled work in a
// child behind Suspense: everything below reads request data, so a boundary
// above those awaits is the only committable shell this group has. Without it
// a client navigation into the group can't commit until the whole dynamic
// tree has rendered — the previous page just freezes with no feedback. (A
// loading.tsx can't provide this; it only covers segments below the blocking
// layout.)
export default function IdentityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <IdentityLayoutInner>{children}</IdentityLayoutInner>
    </Suspense>
  );
}

async function IdentityLayoutInner({
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
