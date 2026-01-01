"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Copy, ExternalLink, Video, Phone, MapPin, Link as LinkIcon, RefreshCw, Eye, CheckCircle, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { EventType, CallType } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { buildBookingUrl } from "@/lib/urls";
import { EventTypeEditor } from "./EventTypeEditor";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getCompanyId } from "@/lib/company";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isLocalMode } from "@/lib/localMode";
import { readLocal, writeLocal } from "@/lib/localStore";
import Link from "next/link";

interface EventTypeWithAnalytics extends EventType {
  is_archived: boolean;
  analytics?: {
    view_count: number;
    submission_count: number;
  };
}

export const EventTypesList = () => {
  const [eventTypes, setEventTypes] = useState<EventTypeWithAnalytics[]>([]);
  const [archivedEventTypes, setArchivedEventTypes] = useState<EventTypeWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [initialTab, setInitialTab] = useState<"basics" | "call-types" | "questions" | "notifications" | "appearance" | "preview">("basics");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventTypeWithAnalytics | null>(null);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [eventToPermanentlyDelete, setEventToPermanentlyDelete] = useState<EventTypeWithAnalytics | null>(null);
  const [viewTab, setViewTab] = useState<"active" | "archived">("active");
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();
  const { entitlements } = useEntitlements();
  const localMode = isLocalMode();

  const LOCAL_KEYS = {
    eventTypes: "local.scheduling.eventTypes",
    anonUserId: "anon_user_id",
  } as const;

  const loadLocalEventTypes = (): EventTypeWithAnalytics[] => {
    const raw = readLocal<EventTypeWithAnalytics[]>(LOCAL_KEYS.eventTypes, []);
    return raw.map((event) => ({
      ...event,
      is_archived: event.is_archived ?? false,
      analytics: event.analytics ?? { view_count: 0, submission_count: 0 },
    }));
  };

  const deleteEventTypePermanently = async (id: string) => {
    if (localMode) {
      const remaining = loadLocalEventTypes().filter((event) => event.id !== id);
      persistLocalEventTypes(remaining);
      setEventTypes(remaining.filter((event) => !event.is_archived));
      setArchivedEventTypes(remaining.filter((event) => event.is_archived));
      toast({
        title: "Deleted",
        description: "Event type removed (local)",
      });
      return;
    }

    const previousArchived = archivedEventTypes;
    setArchivedEventTypes((prev) => prev.filter((event) => event.id !== id));

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated. Please refresh to initialize your session.");
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-event-type`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ id, permanent_delete: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to delete event type");
      }

      toast({
        title: "Deleted",
        description: "Event type permanently deleted",
      });
    } catch (error: any) {
      console.error("Delete event type error:", error);
      setArchivedEventTypes(previousArchived);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete event type",
        variant: "destructive",
      });
    }

    await loadEventTypes();
  };

  const persistLocalEventTypes = (events: EventTypeWithAnalytics[]) => {
    writeLocal(LOCAL_KEYS.eventTypes, events);
  };

  const currentEventCount = eventTypes.length;
  const maxEvents = entitlements.scheduling_capacity.events_max;
  const canCreateMore = currentEventCount < maxEvents;

  const getEffectiveIdentifier = async (): Promise<{ mode: "company" | "user"; value: string }> => {
    if (!localMode) {
      const companyId = await getCompanyId();
      if (companyId) {
        return { mode: "company", value: companyId };
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        return { mode: "user", value: user.id };
      }
    }
    let anon = readLocal<string | null>(LOCAL_KEYS.anonUserId, null);
    if (!anon) {
      anon = crypto.randomUUID();
      writeLocal(LOCAL_KEYS.anonUserId, anon);
    }
    return { mode: "user", value: anon };
  };

  const loadEventTypes = async () => {
    setLoading(true);
    if (localMode) {
      const allEvents = loadLocalEventTypes();
      const activeEvents = allEvents.filter((event) => !event.is_archived);
      const archivedEvents = allEvents.filter((event) => event.is_archived);
      setEventTypes(activeEvents);
      setArchivedEventTypes(archivedEvents);
      setLoading(false);
      return;
    }

    const identifier = await getEffectiveIdentifier();
    
    // Load active event types (owned by user)
    const { data: activeData, error: activeError } = await supabase
      .from("event_types")
      .select("*")
      .eq(identifier.mode === "company" ? "company_id" : "user_id", identifier.value)
      .eq("is_archived", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Load archived event types (owned by user)
    const { data: archivedData, error: archivedError } = await supabase
      .from("event_types")
      .select("*")
      .eq(identifier.mode === "company" ? "company_id" : "user_id", identifier.value)
      .eq("is_archived", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (activeError || archivedError) {
      console.warn("event types load error (non-critical):", { activeError, archivedError });
      setLoadError(null);
      setEventTypes([]);
      setArchivedEventTypes([]);
      setLoading(false);
      return;
    }

    setLoadError(null);

    const analyticsByEventId = new Map<string, { view_count: number; submission_count: number }>();
    const { data: analyticsRows } = await supabase
      .from("event_type_analytics")
      .select("event_type_id, view_count, submission_count");
    analyticsRows?.forEach((row) => {
      if (row?.event_type_id) {
        analyticsByEventId.set(row.event_type_id, {
          view_count: row.view_count ?? 0,
          submission_count: row.submission_count ?? 0,
        });
      }
    });

    // Merge analytics with event types
    const mergeAnalytics = (events: any[] = []) => events.map((event) => {
      const analyticsRow = analyticsByEventId.get(event.id ?? "");
      const allowedCallTypes: CallType[] = Array.isArray(event.allowed_call_types) && event.allowed_call_types.length > 0
        ? event.allowed_call_types
        : [event.default_call_type || event.location_type || "google_meet"];
      const defaultCallType: CallType = event.default_call_type && allowedCallTypes.includes(event.default_call_type)
        ? event.default_call_type
        : allowedCallTypes[0];
      const normalized: EventTypeWithAnalytics = {
        ...event,
        location_type: event.location_type ?? "custom",
        duration_minutes: event.duration_minutes ?? 30,
        is_active: event.is_active ?? false,
        is_archived: event.is_archived ?? false,
        allowed_call_types: allowedCallTypes,
        default_call_type: defaultCallType,
        analytics: analyticsRow
          ? {
              view_count: analyticsRow.view_count ?? 0,
              submission_count: analyticsRow.submission_count ?? 0,
            }
          : {
              view_count: 0,
              submission_count: 0,
            },
      };
      return normalized;
    });

    const activeEvents = mergeAnalytics(activeData);
    const archivedEvents = mergeAnalytics(archivedData);
    setEventTypes(activeEvents);
    setArchivedEventTypes(archivedEvents);
    persistLocalEventTypes([...activeEvents, ...archivedEvents]);
    setLoading(false);
  };

  useEffect(() => {
    loadEventTypes();
  }, []);

  const copyBookingLink = (slug: string) => {
    const link = buildBookingUrl(slug);
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Booking link copied to clipboard",
    });
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'zoom':
      case 'google_meet':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'in_person':
        return <MapPin className="w-4 h-4" />;
      default:
        return <LinkIcon className="w-4 h-4" />;
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (localMode) {
      const allEvents = loadLocalEventTypes();
      const updated = allEvents.map((event) =>
        event.id === id ? { ...event, is_active: !currentStatus, updated_at: new Date().toISOString() } : event
      );
      persistLocalEventTypes(updated);
      setEventTypes(updated.filter((event) => !event.is_archived));
      setArchivedEventTypes(updated.filter((event) => event.is_archived));
      toast({
        title: "Success",
        description: `Event type ${!currentStatus ? 'activated' : 'paused'} (local)`
      });
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated. Please refresh to initialize your session.");
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-event-type`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to update status');
      }
      loadEventTypes();
      toast({
        title: "Success",
        description: `Event type ${!currentStatus ? 'activated' : 'paused'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const archiveEventType = async () => {
    if (!eventToDelete) return;

    const eventId = eventToDelete.id;

    if (localMode) {
      const allEvents = loadLocalEventTypes().map((event) =>
        event.id === eventId ? { ...event, is_archived: true, updated_at: new Date().toISOString() } : event
      );
      persistLocalEventTypes(allEvents);
      setEventTypes(allEvents.filter((event) => !event.is_archived));
      setArchivedEventTypes(allEvents.filter((event) => event.is_archived));
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      toast({
        title: "Success",
        description: "Event type archived (local)",
      });
      return;
    }

    // Optimistically update UI
    setEventTypes((prev) => prev.filter((event) => event.id !== eventId));
    setArchivedEventTypes((prev) => {
      if (eventToDelete.is_archived) {
        return prev.map((event) => (event.id === eventId ? { ...event, is_archived: true } : event));
      }
      return [...prev, { ...eventToDelete, is_archived: true }];
    });

    setDeleteDialogOpen(false);
    setEventToDelete(null);

    toast({
      title: "Success",
      description: "Event type archived",
    });

    // Update database in background
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated. Please refresh to initialize your session.");
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-event-type`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ id: eventId, is_archived: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to archive event type');
      }
    } catch (error: any) {
      console.error("Archive event type error:", error);
      // Revert optimistic update on error
      loadEventTypes();
      toast({
        title: "Error",
        description: error?.message || "Failed to archive event type",
        variant: "destructive",
      });
    }
  };

  const unarchiveEventType = async (id: string) => {
    if (localMode) {
      const allEvents = loadLocalEventTypes().map((event) =>
        event.id === id ? { ...event, is_archived: false, updated_at: new Date().toISOString() } : event
      );
      persistLocalEventTypes(allEvents);
      setEventTypes(allEvents.filter((event) => !event.is_archived));
      setArchivedEventTypes(allEvents.filter((event) => event.is_archived));
      toast({
        title: "Success",
        description: "Event type restored (local)",
      });
      return;
    }

    // Optimistically update UI
    const restoredEvent = archivedEventTypes.find(e => e.id === id);
    if (restoredEvent) {
      setArchivedEventTypes(prev => prev.filter(e => e.id !== id));
      setEventTypes(prev => [...prev, { ...restoredEvent, is_archived: false }]);
    }
    
    toast({
      title: "Success",
      description: "Event type restored",
    });

    // Update database in background
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated. Please refresh to initialize your session.");
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-event-type`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ id, is_archived: false }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to restore event type');
      }
    } catch (error: any) {
      console.error("Restore event type error:", error);
      // Revert optimistic update on error
      loadEventTypes();
      toast({
        title: "Error",
        description: error?.message || "Failed to restore event type",
        variant: "destructive",
      });
    }
  };

  const refreshAllEventTypes = async () => {
    if (eventTypes.length === 0) {
      toast({
        title: "No event types",
        description: "Create at least one event type first",
      });
      return;
    }

    setRefreshing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      if (localMode) {
        const allEvents = loadLocalEventTypes();
        const updatedEvents = allEvents.map((event) => ({
          ...event,
          updated_at: new Date().toISOString(),
        }));
        persistLocalEventTypes(updatedEvents);
        setEventTypes(updatedEvents.filter((event) => !event.is_archived));
        setArchivedEventTypes(updatedEvents.filter((event) => event.is_archived));
        toast({
          title: "Event types refreshed",
          description: `Updated ${eventTypes.length} event type${eventTypes.length !== 1 ? 's' : ''} (local)`,
        });
        return;
      }

      for (const event of eventTypes) {
        const { error } = await supabase
          .from("event_types")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", event.id);

        if (error) {
          errorCount++;
          console.error(`Failed to refresh ${event.name}:`, error);
        } else {
          successCount++;
        }
      }

      if (errorCount === 0) {
        toast({
          title: "All event types refreshed",
          description: `Successfully refreshed ${successCount} event type${successCount !== 1 ? 's' : ''}`,
        });
      } else {
        toast({
          title: "Partial refresh",
          description: `Refreshed ${successCount} event types, ${errorCount} failed`,
          variant: "destructive",
        });
      }

      loadEventTypes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to refresh event types",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (isCreating || editingEvent) {
    return (
      <EventTypeEditor
        eventType={editingEvent}
        initialTab={initialTab}
        onSaved={async () => {
          await loadEventTypes();
        }}
        onClose={() => {
          setIsCreating(false);
          setEditingEvent(null);
          setInitialTab("basics");
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading event types...</p>
        {loadError && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-xs text-destructive">Error: {loadError}</p>
            <Button variant="outline" size="sm" onClick={loadEventTypes}>
              Try again
            </Button>
          </div>
        )}
      </div>
    );
  }

  const renderEventCard = (event: EventTypeWithAnalytics, isArchived: boolean = false) => (
    <Card key={event.id} className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{event.name}</h3>
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <Badge
          variant={event.is_active ? "default" : "secondary"}
          className="ml-2"
        >
          {event.is_active ? "Active" : "Paused"}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          {getLocationIcon(event.location_type)}
          <span className="capitalize">{event.location_type.replace('_', ' ')}</span>
        </div>
        <div>{event.duration_minutes} min</div>
      </div>

      <div className="w-full space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Booking link</p>
        <div className="rounded-lg border border-border/30 bg-muted/40">
          <div className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap overflow-x-auto">
            {buildBookingUrl(event.slug)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          <span className="font-medium">Views:</span>
          <span>{event.analytics?.view_count ?? 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          <span className="font-medium">Bookings:</span>
          <span>{event.analytics?.submission_count ?? 0}</span>
        </div>
      </div>

      {!isArchived && (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => copyBookingLink(event.slug)}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => window.open(buildBookingUrl(event.slug), "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setEditingEvent(event)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => toggleActive(event.id, event.is_active)}
            >
              {event.is_active ? "Pause" : "Activate"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEventToDelete(event);
                setDeleteDialogOpen(true);
              }}
              title="Archive event type"
            >
              <Archive className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </>
      )}

      {isArchived && (
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => unarchiveEventType(event.id)}
          >
            <ArchiveRestore className="w-4 h-4 mr-2" />
            Restore
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setEventToPermanentlyDelete(event);
              setPermanentDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Event Types</h2>
          <p className="text-sm text-muted-foreground">
            Create different types of events for your scheduling needs
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {currentEventCount} / {maxEvents} event types used
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshAllEventTypes}
            disabled={refreshing || eventTypes.length === 0}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    onClick={() => setIsCreating(true)}
                    disabled={!canCreateMore}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Event Type
                  </Button>
                </span>
              </TooltipTrigger>
              {!canCreateMore && (
                <TooltipContent>
                  <p>{entitlements.plan_id === "solo" ? "Solo" : "Pro"} limit reached — upgrade to create more event types</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Lock for Preview plan once 1 active event exists */}
      {!canCreateMore && entitlements.plan_id === "preview" && (
        <div className="rounded-lg border bg-muted/30 p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold">Need more than one event type?</h3>
              <p className="text-sm text-muted-foreground">
                The free plan allows one active event type. Upgrade to unlock a full library of scheduling experiences and additional customization options.
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      )}

      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as "active" | "archived")}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({eventTypes.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="w-4 h-4 mr-2" />
            Archived ({archivedEventTypes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {eventTypes.length === 0 ? (
            <Card className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No event types yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first event type to start accepting bookings
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Event Type
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventTypes.map((event) => renderEventCard(event, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          {archivedEventTypes.length === 0 ? (
            <Card className="p-12 text-center">
              <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No archived event types</h3>
              <p className="text-muted-foreground">
                Event types you archive will appear here
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedEventTypes.map((event) => renderEventCard(event, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Event Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{eventToDelete?.name}"? The event type will be hidden but all data will be preserved.
              Existing bookings will remain intact, but no new bookings can be made.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={archiveEventType}
              className="bg-muted text-foreground hover:bg-muted/80"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event Type</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Permanently delete "{eventToPermanentlyDelete?.name}"? This cannot be undone.
              </p>
              <p>
                All associated bookings, availability, and analytics tied to this event type will be removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToPermanentlyDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (eventToPermanentlyDelete) {
                  deleteEventTypePermanently(eventToPermanentlyDelete.id);
                }
                setPermanentDeleteDialogOpen(false);
                setEventToPermanentlyDelete(null);
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
