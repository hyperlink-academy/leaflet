import { getIdentityData } from "actions/getIdentityData";
import { IdentityContextProvider } from "./IdentityProvider";

export async function IdentityProviderServer(props: {
  children: React.ReactNode;
}) {
  let identity = await getIdentityData();
  return (
    <IdentityContextProvider initialValue={identity}>
      {props.children}
    </IdentityContextProvider>
  );
}
