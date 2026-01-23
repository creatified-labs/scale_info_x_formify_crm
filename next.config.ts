import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Note: DO NOT add fallback values here - they must be set in environment variables
  // This ensures production uses the correct Supabase instance
  async headers() {
    // Allow embedding on any domain for maximum flexibility
    // This enables custom domains, Lovable, Whop, and any other platform to embed booking forms
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
            value: 'frame-ancestors *',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
