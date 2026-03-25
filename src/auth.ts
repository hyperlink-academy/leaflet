import { cookies, headers } from "next/headers";
import { isProductionDomain } from "./utils/isProductionDeployment";

export async function getAuthToken() {
  let cookieStore = await cookies();
  return (
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("external_auth_token")?.value ||
    null
  );
}

export async function setAuthToken(tokenID: string) {
  let c = await cookies();
  let host = (await headers()).get("host");
  c.set("auth_token", tokenID, {
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
    domain: isProductionDomain() ? host! : undefined,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function removeAuthToken() {
  let c = await cookies();
  c.delete({
    name: "auth_token",
    domain: isProductionDomain() ? ".leaflet.pub" : undefined,
  });
}
