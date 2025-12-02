import { headers } from "next/headers";
export async function getCurrentDeploymentDomain() {
  const headersList = await headers();
  const hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwarded-proto");
  return `${protocol}://${hostname}/`;
}
