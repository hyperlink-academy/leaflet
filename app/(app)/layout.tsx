import { Suspense } from "react";
import { IdentityProviderServer } from "components/IdentityProviderServer";
import { RouteUIStateManager } from "components/RouteUIStateManger";
import { SubscriptionSuccessModal } from "components/SubscriptionSuccessModal";
import { SubscribeConfirmationModal } from "components/Subscribe/SubscribeConfirmationModal";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IdentityProviderServer>
      {children}
      <Suspense>
        <SubscriptionSuccessModal />
        <SubscribeConfirmationModal />
      </Suspense>
      <RouteUIStateManager />
    </IdentityProviderServer>
  );
}
