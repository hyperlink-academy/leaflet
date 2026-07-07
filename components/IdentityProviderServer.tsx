import { getIdentityData } from "actions/getIdentityData";
import { IdentityContextProvider } from "./IdentityProvider";

// Deliberately NOT async and does not await the identity: the promise is
// handed to the client provider, which resolves it inside a Suspense boundary.
// This keeps everything below this component in the prerenderable static shell
// while the viewer's identity streams in with the same response.
export function IdentityProviderServer(props: {
  children: React.ReactNode;
}) {
  // No .catch() here: during prerendering Next aborts this promise with a
  // special rejection that React must observe to postpone the hole — mapping
  // it to a value would bake a resolved logged-out identity into the static
  // shell. Backend failures are handled inside getIdentityData instead.
  return (
    <IdentityContextProvider identityPromise={getIdentityData()}>
      {props.children}
    </IdentityContextProvider>
  );
}
