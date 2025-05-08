import { headers, type UnsafeUnwrappedHeaders } from "next/headers";
export function getCurrentDeploymentDomain() {
  const headersList = (headers() as unknown as UnsafeUnwrappedHeaders);
  const hostname = headersList.get("x-forwarded-host");
  let protocol = headersList.get("x-forwarded-proto");
  return `${protocol}://${hostname}/`;
}
