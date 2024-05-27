// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
    ],
  },
  transpilePackages: ["@adobe/react-spectrum", "@react-spectrum/color"],
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
