/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: require('path').join(__dirname, '../'),
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
};

module.exports = nextConfig;