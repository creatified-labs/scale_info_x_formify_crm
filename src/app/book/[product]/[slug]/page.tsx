"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BookingCalendar } from "@/components/forms/BookingCalendar";
import { CheckCircle2, Clock } from "lucide-react";
import { CallTypeSelector } from "@/components/scheduling/CallTypeSelector";
import { InviteeQuestions } from "@/components/scheduling/InviteeQuestions";
import type { EventType, InviteeQuestion } from "@/types/scheduling";
import { useData } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";
import { PoweredByBadge } from "@/components/PoweredByBadge";
import { usePreviewMode } from "@/components/PreviewModeToggle";
import { DEFAULT_PRODUCT_SEGMENT } from "@/lib/urls";
import { EmbedOption1 } from "@/components/embed/EmbedOption1";
import { EmbedOption2 } from "@/components/embed/EmbedOption2";
import { EmbedOption3 } from "@/components/embed/EmbedOption3";
import { parseTimeInTimezone } from "@/lib/timezone";

type ConfirmationDetails = {
  name: string;
  email: string;
  startIso: string;
  endIso: string;
  timezone: string;
  callType: string;
  joinUrl?: string | null;
  locationText?: string | null;
};

const callTypeLabel = (type: string) => {
  switch (type) {
    case 'zoom':
      return 'Zoom Meeting';
    case 'google_meet':
      return 'Google Meet';
    case 'phone':
      return 'Phone Call';
    case 'in_person':
      return 'In-person Meeting';
    case 'custom':
      return 'Custom Link';
    default:
      return 'Meeting';
  }
};

const ATTRIBUTION_API = "https://whop-app-utm.vercel.app/api/link-session-contact";

const getUtmSessionToken = () => {
  const match = document.cookie.match(/utm_session=([^;]+)/);
  return match ? match[1] : null;
};

const linkSessionToContact = async (emailAddress: string, contactName?: string) => {
  const sessionToken = getUtmSessionToken();

  if (!sessionToken) {
    console.log("[UTM Attribution] No session token found - user may not have clicked a tracking link");
    return;
  }

  if (!emailAddress) {
    console.log("[UTM Attribution] No email provided");
    return;
  }

  try {
    const response = await fetch(ATTRIBUTION_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        email: emailAddress,
        name: contactName || undefined,
      }),
    });

    if (response.ok) {
      console.log("[UTM Attribution] Successfully linked booking to UTM session");
    } else {
      console.warn("[UTM Attribution] Failed to link booking:", await response.text());
    }
  } catch (error) {
    console.error("[UTM Attribution] Error linking booking:", error);
  }
};

const PublicBooking = () => {
  const params = useParams<{ slug: string; product?: string }>();
  const slug = params.slug;
  const rawProduct = params.product;
  const product = typeof rawProduct === "string" && rawProduct.trim().length > 0 ? rawProduct.trim() : DEFAULT_PRODUCT_SEGMENT;
  
  const [viewType, setViewType] = useState<"classic" | "wizard" | "progressive" | null>(null);
  const [eventType, setEventType] = useState<(EventType & { branding_hide_badge?: boolean, user_timezone?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [callType, setCallType] = useState<string>("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});
  const previewMode = usePreviewMode();
  const { toast } = useToast();
  const { addCall } = useData();
  const emailIsValid = useMemo(() => {
    if (!email) return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }, [email]);
  const lastCapturedLead = useRef<string | null>(null);
  const [confirmationDetails, setConfirmationDetails] = useState<ConfirmationDetails | null>(null);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (eventType && !callType) {
      setCallType(eventType.default_call_type);
    }
  }, [eventType]);

  // Set view type from event type's saved preference or default to classic
  useEffect(() => {
    if (eventType && viewType === null) {
      console.log('Setting view type from event type:', {
        booking_page_view_style: eventType.booking_page_view_style,
        embed_view_style: eventType.embed_view_style,
        eventType
      });
      // If there's a saved preference, use it; otherwise default to classic
      setViewType(eventType.booking_page_view_style || 'classic');
    }
  }, [eventType, viewType]);

  useEffect(() => {
    loadEventType();
  }, [slug, product]);

  // Apply theme based on event type settings
  useEffect(() => {
    if (!eventType) return;
    
    const themeMode = eventType.theme_mode || 'auto';
    const root = document.documentElement;
    
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else if (themeMode === 'light') {
      root.classList.remove('dark');
    }
    // 'auto' doesn't modify the class, uses system preference
    
    return () => {
      // Cleanup on unmount if needed
    };
  }, [eventType]);

  const loadEventType = async () => {
    if (!slug) return;

    setLoading(true);
    try {
      const search = new URLSearchParams({ slug });
      if (product) {
        search.set("product", product);
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/public-get-event-type?${search.toString()}`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error("event not found");
      }
      const body = await res.json();
      const fetched = body?.event_type as (EventType & { companies?: { branding_hide_badge?: boolean }, profiles?: { timezone?: string } }) | null;
      if (!fetched) {
        throw new Error("event not found");
      }
      console.log('Loaded event type from database:', {
        booking_page_view_style: fetched.booking_page_view_style,
        embed_view_style: fetched.embed_view_style,
        slug: fetched.slug
      });
      setEventType({
        ...fetched,
        branding_hide_badge: fetched.companies?.branding_hide_badge ?? fetched.branding_hide_badge ?? false,
        user_timezone: fetched.profiles?.timezone || 'UTC',
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Event type not found",
        variant: "destructive",
      });
      setEventType(null);
    } finally {
      setLoading(false);
    }
  };

  const trackEventAnalytics = async (type: "view" | "submission") => {
    if (!eventType?.id) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/track-event-analytics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ event_type_id: eventType.id, type }),
      });
    } catch (error) {
      console.warn("trackEventAnalytics failed", error);
    }
  };

  useEffect(() => {
    if (!eventType || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEventAnalytics("view");
  }, [eventType?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventType || !selectedDate || !selectedTime || !callType) return;

    // Input validation with size limits
    if (!name || name.trim().length === 0) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (name.length > 100) {
      toast({
        title: "Error",
        description: "Name must be less than 100 characters",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (email.length > 255) {
      toast({
        title: "Error",
        description: "Email must be less than 255 characters",
        variant: "destructive",
      });
      return;
    }

    linkSessionToContact(email.trim().toLowerCase(), name.trim());

    // Validate phone if required for phone call type
    if (callType === 'phone' && eventType.phone_required_for_phone_type && !phone) {
      toast({
        title: "Error",
        description: "Phone number is required for phone calls",
        variant: "destructive",
      });
      return;
    }

    // Phone format validation
    if (phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
        toast({
          title: "Error",
          description: "Please enter a valid phone number (E.164 format)",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate required questions with size limits
    for (const question of eventType.invitee_form_schema || []) {
      const answer = questionAnswers[question.id];
      
      if (question.required && (!answer || answer.trim().length === 0)) {
        toast({
          title: "Error",
          description: `Please answer: ${question.label}`,
          variant: "destructive",
        });
        return;
      }

      if (answer && answer.length > 2000) {
        toast({
          title: "Error",
          description: `Answer for "${question.label}" must be less than 2000 characters`,
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      // Parse time in the invitee's browser timezone (since that's what they see in the UI)
      // The displayed times are already converted to the invitee's timezone, so we parse it back to UTC
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startTime = parseTimeInTimezone(selectedDate, selectedTime, browserTimezone);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + eventType.duration_minutes);

      // Determine join URL or location based on call type
      let joinUrl = '';
      let locationText = '';
      let providerPending = false;

      if (callType === 'zoom' || callType === 'google_meet') {
        joinUrl = 'Meeting link will be sent by host';
        providerPending = true;
      } else if (callType === 'in_person') {
        locationText = eventType.inperson_location || 'Location TBD';
      } else if (callType === 'custom') {
        joinUrl = eventType.custom_link_url || '';
        locationText = eventType.custom_link_label || 'Custom Link';
      }

      // Create via public Edge Function
      const payload = {
        event_type_id: eventType.id,
        invitee_name: name.trim().substring(0, 100),
        invitee_email: email.trim().toLowerCase().substring(0, 255),
        invitee_phone: phone ? phone.substring(0, 20) : null,
        invitee_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        chosen_call_type: callType,
        video_join_url: joinUrl || null,
        location_text: locationText || null,
        provider_pending: providerPending,
        answers: questionAnswers,
      };
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-booking`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      };
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to create booking');
      }
      const json = await res.json().catch(() => null);
      console.log('📅 Booking response:', json);
      console.log('📅 Calendar sync error:', json?.calendar_sync_error);
      console.log('📅 Debug info:', json?.debug);
      
      const createdBookingId = json?.booking?.id as string | undefined;
      const meetLink = json?.meet_link || json?.booking?.video_join_url;
      console.log('📅 Meet link extracted:', meetLink);

      trackEventAnalytics("submission");

      // Use Meet link if available, otherwise use original join URL
      // For google_meet/zoom, if no meet link was created yet, use the placeholder
      let finalJoinUrl = joinUrl;
      if (meetLink && (callType === 'zoom' || callType === 'google_meet')) {
        finalJoinUrl = meetLink;
      } else if (callType !== 'zoom' && callType !== 'google_meet') {
        // For other call types, use the original joinUrl
        finalJoinUrl = joinUrl;
      }

      // Track submission
      const confirmation: ConfirmationDetails = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        startIso: startTime.toISOString(),
        endIso: endTime.toISOString(),
        timezone: payload.invitee_timezone,
        callType,
        joinUrl: finalJoinUrl,
        locationText,
      };

      // Add to call tracker
      addCall({
        clientName: name,
        email: email,
        phone: phone || undefined,
        callType: "meeting",
        date: format(startTime, 'yyyy-MM-dd'),
        time: format(startTime, 'HH:mm'),
        duration: eventType.duration_minutes,
        notes: `Booking via ${eventType.name}`,
        status: "scheduled",
        bookingId: createdBookingId,
        joinUrl: finalJoinUrl || undefined,
      });

      // Check for custom redirect URL
      if (eventType.redirect_url) {
        window.location.href = eventType.redirect_url;
        return;
      }

      setSubmitted(true);
      setConfirmationDetails(confirmation);

      toast({
        title: "Success!",
        description: "Your booking has been confirmed",
      });
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Error",
        description: error.message === 'Invalid time format' 
          ? 'Please select a valid time slot'
          : 'Failed to create booking. Please try again.',
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const showBadge = !eventType?.branding_hide_badge;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!eventType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground">
            This event type doesn't exist or has been deactivated.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted && confirmationDetails) {
    const startDate = new Date(confirmationDetails.startIso);
    const endDate = new Date(confirmationDetails.endIso);
    const dateLabel = format(startDate, 'EEEE, MMMM d, yyyy');
    const timeLabel = format(startDate, 'h:mm a');
    const endTimeLabel = format(endDate, 'h:mm a');
    const isJoinLink = confirmationDetails.joinUrl?.startsWith('http');
    
    // Generate ICS file content
    const generateICS = () => {
      const formatICSDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      
      let description = `Meeting with ${confirmationDetails.name}`;
      if (confirmationDetails.joinUrl && confirmationDetails.joinUrl.startsWith('http')) {
        description += `\n\nJoin link: ${confirmationDetails.joinUrl}`;
      }
      
      const location = confirmationDetails.joinUrl?.startsWith('http') 
        ? confirmationDetails.joinUrl 
        : (confirmationDetails.locationText || eventType.inperson_location || '');
      
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Booking System//EN',
        'BEGIN:VEVENT',
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${eventType.name}`,
        `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
        `LOCATION:${location}`,
        `STATUS:CONFIRMED`,
        `SEQUENCE:0`,
        `UID:${Date.now()}@booking-system`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      
      return icsContent;
    };
    
    const downloadICS = () => {
      const icsContent = generateICS();
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${eventType.name.replace(/[^a-z0-9]/gi, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    };

    return (
      <div className={cn("min-h-screen bg-background p-3 lg:p-4 flex items-center justify-center")}> 
        {showBadge && <PoweredByBadge />}
        <Card className="max-w-xl w-full p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <h1 className="text-xl font-semibold">Booking confirmed!</h1>
              <p className="text-sm text-muted-foreground">We’ve sent details to {confirmationDetails.email}.</p>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-medium">Event</h2>
            <p className="text-sm text-foreground">{eventType.name}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Invitee</h3>
              <p className="text-sm text-foreground">{confirmationDetails.name}</p>
              <p className="text-sm text-muted-foreground">{confirmationDetails.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">When</h3>
              <p className="text-sm text-foreground">{dateLabel}</p>
              <p className="text-sm text-muted-foreground">{timeLabel} - {endTimeLabel} ({confirmationDetails.timezone})</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Call type</h3>
              <p className="text-sm text-foreground">{callTypeLabel(confirmationDetails.callType)}</p>
            </div>
            {(confirmationDetails.locationText || eventType.inperson_location) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Location</h3>
                <p className="text-sm text-foreground">{confirmationDetails.locationText || eventType.inperson_location}</p>
              </div>
            )}
          </div>

          {confirmationDetails.joinUrl && (
            <div className="rounded-md border p-3 space-y-1">
              <h3 className="text-sm font-semibold">Join link</h3>
              {isJoinLink ? (
                <a href={confirmationDetails.joinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                  {confirmationDetails.joinUrl}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">{confirmationDetails.joinUrl}</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <h4 className="text-sm font-semibold">📧 Check Your Email</h4>
              <p className="text-xs text-muted-foreground">
                A booking confirmation has been sent to <span className="font-medium">{confirmationDetails.email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                The email contains all the details about your booking{confirmationDetails.joinUrl ? ' and the meeting link' : ''}.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = `mailto:${confirmationDetails.email}`}
              >
                Open Email
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadICS}
              >
                Add to Calendar
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Need to make a change? Check your email for reschedule and cancellation links.
          </p>
        </Card>
      </div>
    );
  }

  // Don't render until we have a viewType
  if (!viewType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Render the selected view */}
      {viewType === "classic" && <EmbedOption1 eventType={eventType} />}
      {viewType === "wizard" && <EmbedOption2 eventType={eventType} />}
      {viewType === "progressive" && <EmbedOption3 eventType={eventType} />}
    </div>
  );
};

export default PublicBooking;
