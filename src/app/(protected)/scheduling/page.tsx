"use client";

export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventTypesList } from "@/components/scheduling/EventTypesList";
import { AvailabilityEditor } from "@/components/scheduling/AvailabilityEditor";
import { TimeBlocksEditor } from "@/components/scheduling/TimeBlocksEditor";
import { BookingsList } from "@/components/scheduling/BookingsList";
import { IntegrationsSettings } from "@/components/scheduling/IntegrationsSettings";
import { NotificationsSettings } from "@/components/scheduling/NotificationsSettings";
import { supabase } from "@/integrations/supabase/client";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { getUsageCurrentCompany } from "@/lib/usage";
import { PreviewBanner } from "@/components/entitlements/PreviewBanner";

const Scheduling = () => {
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const { entitlements } = useEntitlements();
  const [usage, setUsage] = useState<{ bookingsTotal: number } | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);

  useEffect(() => {
    // Set client-side only values after mount to avoid hydration mismatch
    setIsLocalhost(
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    );
    // Show integrations tab in all environments
    setShowIntegrations(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;
      if (sessionUser?.id && isMounted) {
        setEffectiveUserId(sessionUser.id);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      if (isMounted) {
        setEffectiveUserId(userId);
      }
    };

    resolveUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const userId = session?.user?.id ?? null;
      setEffectiveUserId(userId);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getUsageCurrentCompany();
      setUsage({ bookingsTotal: u.bookingsTotal });
    })();
  }, []);

  const [activeTab, setActiveTab] = useState<string>('event-types');

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Scheduling</h1>
          <p className="text-muted-foreground">
            Manage your event types, availability, and bookings
          </p>
        </div>

        {entitlements.plan_id === 'preview' && usage && (
          <PreviewBanner used={usage.bookingsTotal} limit={10} />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="event-types">Event Types</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="time-blocks">Time Blocks</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            {showIntegrations && <TabsTrigger value="integrations">Integrations</TabsTrigger>}
          </TabsList>

          <TabsContent value="event-types" className="mt-6">
            <EventTypesList />
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            {activeTab === 'availability' && <AvailabilityEditor />}
          </TabsContent>

          <TabsContent value="time-blocks" className="mt-6">
            {activeTab === 'time-blocks' && (
              effectiveUserId ? (
                <TimeBlocksEditor userId={effectiveUserId} scope="global_for_host" />
              ) : (
                <div className="text-muted-foreground">Loading time blocks...</div>
              )
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            {activeTab === 'bookings' && <BookingsList />}
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            {activeTab === 'notifications' && <NotificationsSettings />}
          </TabsContent>

          {showIntegrations && (
            <TabsContent value="integrations" className="mt-6">
              <IntegrationsSettings />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Scheduling;
