"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

// This route handles /dashboard/:companyId URLs from Whop
// It ensures the correct company context is set, then redirects to /dashboard
export default function DashboardWithCompanyId() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState("Loading...");
  const companyId = params.companyId as string;

  useEffect(() => {
    const handleCompanySwitch = async () => {
      if (!companyId) {
        router.replace("/dashboard");
        return;
      }

      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        const sessionWhopOrgId = session?.user?.user_metadata?.whop_org_id;

        // If already on the correct company, redirect immediately
        if (session && sessionWhopOrgId === companyId) {
          router.replace("/dashboard");
          return;
        }

        // Need to switch companies - emit event to clear stale data
        setStatus("Switching company...");
        window.dispatchEvent(new CustomEvent('company-switching'));

        // Sign out old session
        if (session) {
          await supabase.auth.signOut();
        }

        // Bootstrap with new company context
        setStatus("Connecting...");
        const { bootstrapWhopUser } = await import('@/lib/whop-bootstrap');
        const result = await bootstrapWhopUser();

        if (result.success) {
          // Wait for session to settle
          await new Promise(resolve => setTimeout(resolve, 100));
          window.dispatchEvent(new CustomEvent('company-switched'));
          
          // Redirect to clean dashboard URL
          router.replace("/dashboard");
        } else {
          setStatus("Failed to connect. Redirecting...");
          // Still redirect to dashboard - AuthContext will handle re-auth
          setTimeout(() => router.replace("/dashboard"), 1000);
        }
      } catch (error) {
        console.error("[CompanyRoute] Error:", error);
        setStatus("Error. Redirecting...");
        setTimeout(() => router.replace("/dashboard"), 1000);
      }
    };

    handleCompanySwitch();
  }, [companyId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
