"use client";

export const dynamic = 'force-dynamic';
import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { Calendar as CalendarIcon, Settings, Clock } from "lucide-react";
import { ScheduledCallsTab } from "@/components/calendar/ScheduledCallsTab";
import { EventsTab } from "@/components/calendar/EventsTab";
import { AutomationsTab } from "@/components/calendar/AutomationsTab";

const Calendar = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-8 h-8" />
              Calendar
            </h1>
            <p className="text-muted-foreground">
              Manage your scheduled calls, events, and automations
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/scheduling?tab=availability">
                <Clock className="w-4 h-4 mr-2" />
                Availability
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/scheduling?tab=bookings">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Bookings
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/scheduling?tab=settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="scheduled-calls" className="w-full">
          <TabsList>
            <TabsTrigger value="scheduled-calls">Scheduled Calls</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="automations">Automations</TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled-calls" className="mt-6">
            <ScheduledCallsTab />
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            <EventsTab />
          </TabsContent>

          <TabsContent value="automations" className="mt-6">
            <AutomationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Calendar;
