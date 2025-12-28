import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zhutmhzwolidcqkoczuo.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpodXRtaHp3b2xpZGNxa29jenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MzcwNTQsImV4cCI6MjA3NzUxMzA1NH0.8QTSVk1jkkEjX76zGyWp1lodotFBUONQE5iLnzvQi1g',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://whop.com',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://whop.com https://*.whop.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
