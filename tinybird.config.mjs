/** @type {import("@tinybirdco/sdk").TinybirdConfig} */
const tinybirdConfig = {
  include: ["lib/tinybird.ts"],
  token: process.env.TINYBIRD_TOKEN,
  baseUrl: process.env.TINYBIRD_URL,
  devMode: "branch", // or "local" if you want to run the project locally (Tinybird Local required)
};

export default tinybirdConfig;
