import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Note: DO NOT add fallback values here - they must be set in environment variables
  // This ensures production uses the correct Supabase instance
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Build allowed frame ancestors
    const allowedDomains = [
      "'self'",
      "https://whop.com",
      "https://*.whop.com"
    ];

    // Add Lovable domains in development only for preview testing
    if (isDevelopment) {
      allowedDomains.push("https://*.lovable.app");
    }

    const cspFrameAncestors = `frame-ancestors ${allowedDomains.join(' ')}`;

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: isDevelopment ? 'ALLOWALL' : 'ALLOW-FROM https://whop.com',
          },
          {
            key: 'Content-Security-Policy',
            value: cspFrameAncestors,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
