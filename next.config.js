// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };

    return config;
  },
  async rewrites() {
    return [
      {
        source: "/potluck",
        destination: "/template/5465909f-7a19-4873-b796-0c6be3ec9f04",
      },
    ];
  },
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  images: {
    loader: "custom",
    loaderFile: "./supabase/supabase-image-loader.js",
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
      { protocol: "https", hostname: "bdefzwcumgzjwllsnaej.supabase.co" },
    ],
  },
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: "5mb",
    },
    staleTimes: {
      dynamic: 600,
      static: 600,
    },
  },
};

const withMDX = require("@next/mdx")({
  extension: /\.mdx?$/,
});

module.exports = withMDX(nextConfig);
