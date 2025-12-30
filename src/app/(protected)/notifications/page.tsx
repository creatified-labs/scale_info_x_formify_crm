"use client";

import { NotificationsSettings } from "@/components/scheduling/NotificationsSettings";

export default function NotificationsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Manage email templates and notification settings for your bookings
        </p>
      </div>
      
      <NotificationsSettings />
    </div>
  );
}
