export function isProductionDomain() {
  let vercel_env = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
  console.log({ vercel_env });
  return process.env.NODE_ENV === "production" && vercel_env === "production";
}
