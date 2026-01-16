import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-expect-error - Internal Next.js types might not be updated yet
  eslint: {
    ignoreDuringBuilds: true,
  },
  // @ts-expect-error - Internal Next.js types might not be updated yet
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.tgdd.vn',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
  },
};

export default nextConfig;
