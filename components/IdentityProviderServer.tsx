import { getIdentityData } from "actions/getIdentityData";
import { IdentityContextProvider } from "./IdentityProvider";

// Deliberately NOT async and does not await the identity: the promise is
// handed to the client provider, which resolves it inside a Suspense boundary.
// This keeps everything below this component in the prerenderable static shell
// while the viewer's identity streams in with the same response.
export function IdentityProviderServer(props: {
  children: React.ReactNode;
}) {
  // Swallow identity-backend failures so a public page still renders
  // (logged-out) if the auth lookup errors.
  const identityPromise = getIdentityData().catch(() => null);
  return (
    <IdentityContextProvider identityPromise={identityPromise}>
      {props.children}
    </IdentityContextProvider>
  );
}
