import { headers } from "next/headers";
export function getCurrentDeploymentDomain() {
  const headersList = headers();
  const hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwarded-proto");
  return `${protocol}://${hostname}/`;
}
