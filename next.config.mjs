/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
