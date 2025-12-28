"use client";

// This route is a Whop dashboard fallback that handles /experience/:experienceId URLs
// It renders the main Index component
import Index from "../../(protected)/page";

export default function ExperiencePage() {
  return <Index />;
}
