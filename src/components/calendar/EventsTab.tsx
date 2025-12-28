"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Copy, ExternalLink, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EventType } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { buildBookingUrl } from "@/lib/urls";
import { EventEditorDrawer } from "./EventEditorDrawer";

export const EventsTab = () => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const loadEventTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("event_types")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load event types",
        variant: "destructive",
      });
    } else {
      setEventTypes((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("event_types")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      loadEventTypes();
      toast({
        title: "Success",
        description: `Event type ${!currentStatus ? 'activated' : 'paused'}`,
      });
    }
  };

  if (isCreating || editingEvent) {
    return (
      <EventEditorDrawer
        eventType={editingEvent}
        onClose={() => {
          setIsCreating(false);
          setEditingEvent(null);
          loadEventTypes();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading event types...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Event Types</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage your scheduling event types
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event Type
        </Button>
      </div>

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
          {eventTypes.map((event) => (
            <Card key={event.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 truncate">{event.name}</h3>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge variant={event.is_active ? "default" : "secondary"}>
                    {event.is_active ? "Active" : "Paused"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleActive(event.id, event.is_active)}>
                        {event.is_active ? "Pause" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div>{event.duration_minutes} min</div>
                <div className="capitalize">{event.default_call_type?.replace('_', ' ') || event.location_type.replace('_', ' ')}</div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded truncate">
                {buildBookingUrl(event.slug)}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyBookingLink(event.slug)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(buildBookingUrl(event.slug), "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => setEditingEvent(event)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
