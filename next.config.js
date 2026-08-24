// @ts-check

const { IMAGE_WIDTHS } = require("./supabase/imageSizes");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "2bac-68-196-189-132.ngrok-free.app",
    "jared-framework-13.cuttlefish-frog.ts.net",
  ],
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
  async headers() {
    return [
      {
        // Generated opengraph-image routes are served with a hash suffix
        // because they sit inside route groups. Keep them out of the search
        // index — unfurl bots fetch og:image URLs directly and ignore robots
        // directives, so previews are unaffected.
        source:
          "/:path*/:image(opengraph\\-image|opengraph\\-image\\-\\w+)",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
  // Caps the CDN stale-while-revalidate window for ISR pages (default is one
  // year — a bad cached page could be served stale that long).
  expireTime: 86400,
  serverExternalPackages: ["yjs", "pino", "jsdom"],
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  images: {
    loader: "custom",
    loaderFile: "./supabase/supabase-image-loader.js",
    deviceSizes: IMAGE_WIDTHS,
    imageSizes: [],
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
      { protocol: "https", hostname: "bdefzwcumgzjwllsnaej.supabase.co" },
    ],
  },
  reactCompiler: true,
  experimental: {
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
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
module.exports = withBundleAnalyzer(withMDX(nextConfig));
