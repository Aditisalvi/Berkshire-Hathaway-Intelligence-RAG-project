/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@mastra/*'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;


