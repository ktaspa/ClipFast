/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/media/:path*", destination: `${backendUrl}/media/:path*` },
    ];
  },
};

module.exports = nextConfig;
