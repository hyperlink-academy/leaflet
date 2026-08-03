import { Suspense } from "react";
import { ClientIdentityProvider } from "components/IdentityProvider";
import { RouteUIStateManager } from "components/RouteUIStateManger";
import { SubscriptionSuccessModal } from "components/SubscriptionSuccessModal";
import { SubscribeConfirmationModal } from "components/Subscribe/SubscribeConfirmationModal";
import { RecommendConfirmationToast } from "components/Interactions/RecommendConfirmationToast";

// The leaflet editor (/[leaflet_id]): the token in the URL is the capability,
// so the server render needs no identity — the page renders dynamically
// per-request (each leaflet has few viewers, and query params like ?page= are
// honored in the server render), while identity arrives client-side. Keeping
// this layout synchronous and free of request-coupled reads is what avoids the
// (identity) group's full-page loading shell: nothing above the page blocks,
// so a hard load streams the document directly and a client navigation only
// waits on the page's own queries.
//
// Editor chrome reads the full identity payload (publications, custom_domains,
// permission_token_on_homepage), so this mounts ClientIdentityProvider — the
// full-payload counterpart of the (published) group's slim
// ViewerIdentityProvider.
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientIdentityProvider>
      {children}
      <Suspense>
        <SubscriptionSuccessModal />
        <SubscribeConfirmationModal />
        <RecommendConfirmationToast />
      </Suspense>
      <RouteUIStateManager />
    </ClientIdentityProvider>
  );
}
