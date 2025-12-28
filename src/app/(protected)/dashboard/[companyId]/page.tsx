"use client";

// This route is a Whop dashboard fallback that handles /dashboard/:companyId URLs
// It renders the same Index component as the main dashboard
import Index from "../../page";

export default function DashboardWithCompanyId() {
  return <Index />;
}
