/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Smaller, more stable imports (fewer broken vendor-chunks in dev for motion + icons).
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
    ],
  },
  webpack: (config, { dev }) => {
    // Dev stability: frequent polling + low aggregateTimeout causes rapid recompiles; the browser
    // can request old `/_next/static/*?v=…` URLs mid-rebuild → 404 on layout.css / main-app.js.
    //
    // Disk PackFileCacheStrategy can corrupt (ENOENT vendor-chunks/framer-motion). Memory cache
    // avoids stale pack metadata pointing at deleted chunks — slight RAM tradeoff, much stabler dev.
    if (dev) {
      config.cache = { type: "memory", maxGenerations: 1 };
      const pollMs = process.env.WATCHPACK_POLLING === "true" ? 2000 : undefined;
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        ...(pollMs ? { poll: pollMs } : {}),
        aggregateTimeout: 800,
        ignored: ["**/node_modules/**", "**/.git/**"],
      };
    }
    return config;
  },
  async rewrites() {
    // Use 127.0.0.1 by default: on some systems `localhost` resolves to ::1 first while
    // uvicorn may only accept IPv4, which breaks Next.js rewrites (server-side proxy).
    // Use afterFiles so `/_next/static/*` is always served by Next before these run.
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
    const firebaseAuthHandlerHost =
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_HANDLER_DOMAIN ||
      (firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : "");
    return {
      beforeFiles: [
        ...(firebaseAuthHandlerHost
          ? [
              {
                source: "/__/auth/:path*",
                destination: `https://${firebaseAuthHandlerHost}/__/auth/:path*`,
              },
            ]
          : []),
      ],
      afterFiles: [
        { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
        { source: "/media/:path*", destination: `${backendUrl}/media/:path*` },
      ],
      fallback: [],
    };
  },
};

module.exports = nextConfig;
