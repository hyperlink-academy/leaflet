import { getIdentityData } from "actions/getIdentityData";
import { IdentityContextProvider } from "./IdentityProvider";

// Starts the identity fetch without awaiting it: the promise is handed to the
// client provider, which use()-suspends at the nearest boundary above this
// mount point while server children (the home leaflet fetch, page queries)
// render in parallel. Mount it under the Suspense boundary of the segment that
// should show the loading state — getIdentityData is React-cached, so multiple
// mounts in one request share a single query.
export function IdentityProviderServer(props: {
  children: React.ReactNode;
}) {
  return (
    <IdentityContextProvider identityPromise={getIdentityData()}>
      {props.children}
    </IdentityContextProvider>
  );
}
