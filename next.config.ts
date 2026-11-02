import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Keycloak sign-in (npm run dev:sso) runs the dev server on this host, so IAM's cookie for *.development.oanstaging.com reaches it.
  allowedDevOrigins: ["da-local.development.oanstaging.com","192.168.1.101"],
  // The default bottom-left indicator sits on top of the sidebar's role switcher.
  devIndicators: {
    position: "bottom-right",
  },
  // Knowledge Base video covers are YouTube thumbnails.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
};

export default nextConfig;
