"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Mail, Phone, Video, MapPin, Link as LinkIcon, Copy, ExternalLink } from "lucide-react";
import { Booking, EventType } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export const ScheduledCallsTab = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    
    const [bookingsRes, eventTypesRes] = await Promise.all([
      supabase.from("bookings").select("*").order("start_time", { ascending: false }),
      supabase.from("event_types").select("*")
    ]);

    if (bookingsRes.error) {
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } else {
      setBookings((bookingsRes.data || []) as Booking[]);
    }

    if (!eventTypesRes.error) {
      setEventTypes((eventTypesRes.data || []) as any);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-500",
      completed: "bg-green-500",
      canceled: "bg-gray-500",
      no_show: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getCallTypeIcon = (type: string) => {
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

  const copyJoinUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Join URL copied to clipboard" });
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesEventType = eventTypeFilter === "all" || booking.event_type_id === eventTypeFilter;
    const matchesSearch = searchTerm === "" || 
      booking.invitee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.invitee_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesEventType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading scheduled calls...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:max-w-xs"
        />
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>

        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="md:w-[200px]">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Event Types</SelectItem>
            {eventTypes.map(et => (
              <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredBookings.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No scheduled calls</h3>
          <p className="text-muted-foreground">
            Your scheduled calls will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const eventType = eventTypes.find(et => et.id === booking.event_type_id);
            
            return (
              <Card key={booking.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{booking.invitee_name}</h3>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{booking.invitee_email}</span>
                      </div>
                      {booking.invitee_phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{booking.invitee_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{format(new Date(booking.start_time), 'EEEE, MMM d, yyyy')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                    </span>
                  </div>

                  {eventType && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Event:</span>
                      <span className="font-medium">{eventType.name}</span>
                    </div>
                  )}

                  {booking.chosen_call_type && (
                    <div className="flex items-center gap-2 text-sm">
                      {getCallTypeIcon(booking.chosen_call_type)}
                      <span className="capitalize">{booking.chosen_call_type.replace('_', ' ')}</span>
                      {booking.provider_pending && (
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      )}
                    </div>
                  )}

                  {booking.location_text && (
                    <div className="flex items-center gap-2 text-sm col-span-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{booking.location_text}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  {booking.video_join_url && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.open(booking.video_join_url, '_blank')}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyJoinUrl(booking.video_join_url!)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm">
                    Reschedule
                  </Button>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
