// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
    ],
  },
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

const withMDX = require("@next/mdx")({
  extension: /\.mdx?$/,
});

module.exports = withMDX(nextConfig);
