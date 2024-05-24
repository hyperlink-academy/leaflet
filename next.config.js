// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@adobe/react-spectrum", "@react-spectrum/color"],
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
