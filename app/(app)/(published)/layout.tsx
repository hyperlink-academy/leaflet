import { Suspense } from "react";
import { ViewerIdentityProvider } from "components/IdentityProvider";
import { RouteUIStateManager } from "components/RouteUIStateManger";
import { SubscriptionSuccessModal } from "components/SubscriptionSuccessModal";
import { SubscribeConfirmationModal } from "components/Subscribe/SubscribeConfirmationModal";
import { RecommendConfirmationToast } from "components/Interactions/RecommendConfirmationToast";

// Published, cacheable surfaces. Nothing in this layout (or reachable from any
// page in this group) may read cookies()/headers()/searchParams outside a
// Suspense boundary — identity arrives client-side via ViewerIdentityProvider.
// Identity-gated pub surfaces (dashboard, edit, theme-settings, join,
// contributor_accept, createPub) live in the (identity) sibling group under
// the same /lish URLs, where the group layout provides server-fed identity.
export default function PublishedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewerIdentityProvider published>
      {children}
      <Suspense>
        <SubscriptionSuccessModal />
        <SubscribeConfirmationModal />
        <RecommendConfirmationToast />
      </Suspense>
      <RouteUIStateManager />
    </ViewerIdentityProvider>
  );
}
