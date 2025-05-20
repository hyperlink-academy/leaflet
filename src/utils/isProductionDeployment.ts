export function isProductionDomain() {
  let url =
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  return process.env.NODE_ENV === "production" && url.includes("leaflet.pub");
}
