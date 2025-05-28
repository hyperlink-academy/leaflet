import { cookies, headers } from "next/headers";
import { isProductionDomain } from "./utils/isProductionDeployment";

export async function setAuthToken(tokenID: string) {
  let c = await cookies();
  c.set("auth_token", tokenID, {
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
    domain: isProductionDomain() ? "leaflet.pub" : undefined,
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
