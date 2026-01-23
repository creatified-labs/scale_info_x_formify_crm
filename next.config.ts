import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Note: DO NOT add fallback values here - they must be set in environment variables
  // This ensures production uses the correct Supabase instance
  async headers() {
    // Build allowed frame ancestors - includes Lovable for development/preview
    const allowedDomains = [
      "'self'",
      "https://whop.com",
      "https://*.whop.com",
      "https://*.lovable.app"
    ];

    const cspFrameAncestors = `frame-ancestors ${allowedDomains.join(' ')}`;

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
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
