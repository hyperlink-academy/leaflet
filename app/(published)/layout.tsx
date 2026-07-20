import { Suspense } from "react";
import { getIdentityData } from "actions/getIdentityData";
import { IdentityContextProvider } from "components/IdentityProvider";
import { RouteUIStateManager } from "components/RouteUIStateManger";
import { SubscriptionSuccessModal } from "components/SubscriptionSuccessModal";
import { SubscribeConfirmationModal } from "components/Subscribe/SubscribeConfirmationModal";

// Published publication/document routes. Unlike the (app) layout, this one
// deliberately does not await headers() or the viewer's identity: the identity
// promise is handed to the client provider, which resolves it inside a
// Suspense boundary, so the whole subtree stays in the prerenderable static
// shell while identity streams in with the same response.
export default function PublishedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IdentityContextProvider identityPromise={getIdentityData()}>
      {children}
      <Suspense>
        <SubscriptionSuccessModal />
        <SubscribeConfirmationModal />
      </Suspense>
      <RouteUIStateManager />
    </IdentityContextProvider>
  );
}
