import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // The default bottom-left indicator sits on top of the sidebar's role switcher.
  devIndicators: {
    position: "bottom-right",
  },
  // The staff IAM sets its sign-in cookies on development.oanstaging.com, so locally the app is opened as
  // https://da-local.development.oanstaging.com:3000 (README, "Staff sign-in"); the dev server must allow that host.
  allowedDevOrigins: ["da-local.development.oanstaging.com"],
  // Knowledge Base video covers are YouTube thumbnails.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
  // API calls go to /api/v1 on this app and are proxied to the backend, so the browser needs no CORS setup.
  // Set API_BASE_URL to point at another backend.
  async rewrites() {
    const backend = process.env.API_BASE_URL ?? "http://127.0.0.1:8200";
    return [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }];
  },
};

export default nextConfig;
