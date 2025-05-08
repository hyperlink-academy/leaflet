import { cookies, headers, type UnsafeUnwrappedHeaders } from "next/headers";
export function getIsBot() {
  const userAgent = (headers() as unknown as UnsafeUnwrappedHeaders).get("user-agent") || "";
  console.log("User agent: ", userAgent);
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /googlebot/i,
    /bingbot/i,
    /yahoo/i,
    // Add more patterns as needed
  ];

  return botPatterns.some((pattern) => pattern.test(userAgent));
}
