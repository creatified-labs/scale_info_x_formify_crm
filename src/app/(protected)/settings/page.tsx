"use client";

import { IntegrationsSettings } from "@/components/scheduling/IntegrationsSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your integrations, calendar preferences, and account settings
        </p>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="calendar">Calendar Preferences</TabsTrigger>
          <TabsTrigger value="meeting">Meeting Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsSettings />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Preferences</CardTitle>
              <CardDescription>
                Configure how your calendar integrations work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Timezone</h3>
                <p className="text-sm text-muted-foreground">
                  Your timezone is automatically detected. All times will be displayed in your local timezone.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Calendar Sync</h3>
                <p className="text-sm text-muted-foreground">
                  When connected, your Google Calendar will automatically block busy times and prevent double bookings.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Conflict Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time conflict detection ensures you never get double-booked across your calendars.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meeting" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Defaults</CardTitle>
              <CardDescription>
                Set default preferences for your meetings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Default Meeting Duration</h3>
                <p className="text-sm text-muted-foreground">
                  Configure default durations in your event types. Each event type can have its own duration.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Buffer Time</h3>
                <p className="text-sm text-muted-foreground">
                  Add buffer time before or after meetings in your event type settings to give yourself breathing room between calls.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Meeting Links</h3>
                <p className="text-sm text-muted-foreground">
                  When Google Calendar is connected, Google Meet links are automatically generated for all bookings.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
