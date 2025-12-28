"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvailabilityEditor } from "./AvailabilityEditor";
import { Separator } from "@/components/ui/separator";

export const SchedulingSettings = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Scheduling Settings</h2>
        <p className="text-muted-foreground">
          Configure your availability and integrations
        </p>
      </div>

      <AvailabilityEditor />

      <Separator />

      <div>
        <h3 className="text-xl font-semibold mb-4">Integrations</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Connect your calendar and video conferencing tools
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="" alt="Google Meet" className="w-9 h-9 object-contain" />
              <div>
                <h3 className="font-semibold">Google Meet</h3>
                <p className="text-sm text-muted-foreground">
                  Add Meet links to your events
                </p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <Button variant="outline" disabled>
            Connect Google Meet
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="https://www.google.com/calendar/images/ext/gc_button1_en.gif" alt="Google Calendar" className="w-9 h-9 object-contain" />
              <div>
                <h3 className="font-semibold">Google Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Sync your events and check availability
                </p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <Button variant="outline" disabled>
            Connect Google Calendar
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="" alt="Zoom" className="w-9 h-9 object-contain" />
              <div>
                <h3 className="font-semibold">Zoom</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically create meeting links
                </p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <Button variant="outline" disabled>
            Connect Zoom
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="" alt="Meta Pixel" className="w-9 h-9 object-contain" />
              <div>
                <h3 className="font-semibold">Meta Pixel</h3>
                <p className="text-sm text-muted-foreground">
                  Track conversions and analytics
                </p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <Button variant="outline" disabled>
            Connect Meta Pixel
          </Button>
        </Card>
      </div>
    </div>
  );
};
