/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress telemetry prompt
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // Transpile packages that use ESM (react-markdown v9+ etc)
  // Not needed for react-markdown v8 which we're using
  experimental: {},
};

module.exports = nextConfig;