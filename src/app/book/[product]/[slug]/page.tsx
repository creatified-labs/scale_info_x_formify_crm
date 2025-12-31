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

const PublicBooking = () => {
  const params = useParams<{ slug: string; product?: string }>();
  const slug = params.slug;
  const rawProduct = params.product;
  const product = typeof rawProduct === "string" && rawProduct.trim().length > 0 ? rawProduct.trim() : DEFAULT_PRODUCT_SEGMENT;
  const [eventType, setEventType] = useState<(EventType & { branding_hide_badge?: boolean }) | null>(null);
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
      const fetched = body?.event_type as (EventType & { companies?: { branding_hide_badge?: boolean } }) | null;
      if (!fetched) {
        throw new Error("event not found");
      }
      setEventType({
        ...fetched,
        branding_hide_badge: fetched.companies?.branding_hide_badge ?? fetched.branding_hide_badge ?? false,
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
      // Duplicate booking prevention: Check for recent booking with same email and event
      // Parse time in 12-hour format (e.g., "9:00 AM")
      const timeMatch = selectedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!timeMatch) {
        throw new Error('Invalid time format');
      }

      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();

      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
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
      const createdBookingId = json?.booking?.id as string | undefined;
      const meetLink = json?.meet_link || json?.booking?.video_join_url;

      trackEventAnalytics("submission");

      // Use Meet link if available, otherwise use original join URL
      const finalJoinUrl = meetLink || joinUrl;

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
    const googleStart = format(startDate, "yyyyMMdd'T'HHmmss'Z'");
    const googleEnd = format(endDate, "yyyyMMdd'T'HHmmss'Z'");
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventType.name)}&dates=${googleStart}%2F${googleEnd}&details=${encodeURIComponent(`Meeting with ${confirmationDetails.name}`)}&location=${encodeURIComponent(confirmationDetails.locationText || eventType.inperson_location || '')}`;
    const isJoinLink = confirmationDetails.joinUrl?.startsWith('http');

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

          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full">Add to Google Calendar</Button>
            </a>
            <Button variant="outline" className="flex-1" onClick={() => window.print()}>
              Print confirmation
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Need to make a change? Check your email for reschedule and cancellation links.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background p-3 lg:p-4 flex items-center justify-center")}> 
      {showBadge && <PoweredByBadge />}
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          {/* Column 1: Form */}
          <Card className="flex flex-col h-auto lg:h-[520px]">
            <div className="p-4 border-b flex-shrink-0">
              <h1 className="text-lg font-bold mb-1">{eventType.name}</h1>
              {eventType.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{eventType.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{eventType.duration_minutes} min</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto px-4 py-4 space-y-4">
                <CallTypeSelector
                  allowedTypes={eventType.allowed_call_types || [eventType.location_type]}
                  selectedType={callType as any}
                  onTypeChange={setCallType}
                  onPhoneChange={setPhone}
                  phoneValue={phone}
                  phoneRequired={eventType.phone_required_for_phone_type}
                  inPersonLocation={eventType.inperson_location}
                  customLinkUrl={eventType.custom_link_url}
                  customLinkLabel={eventType.custom_link_label}
                />
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                    {email.length > 0 && !emailIsValid && (
                      <p className="text-sm text-destructive">Enter a valid email address (example@domain.com) to continue.</p>
                    )}
                  </div>
                  {eventType.invitee_form_schema && eventType.invitee_form_schema.length > 0 && (
                    <InviteeQuestions
                      questions={eventType.invitee_form_schema}
                      answers={questionAnswers}
                      onAnswerChange={(questionId, value) =>
                        setQuestionAnswers({ ...questionAnswers, [questionId]: value })
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Column 2: Calendar */}
          <Card className="flex flex-col h-auto lg:h-[520px]">
            <div className="p-4 border-b flex-shrink-0">
              <h2 className="text-base font-semibold">Select a Date</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Europe/London</p>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <BookingCalendar
                form={{
                  ...eventType,
                  user_id: eventType.user_id,
                  use_custom_availability: eventType.use_custom_availability,
                  email,
                } as any}
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                renderTimesColumn={false}
              />
            </div>
          </Card>

          {/* Column 3: Time slots */}
          <Card className="flex flex-col h-auto lg:h-[520px]">
            <div className="p-4 border-b flex-shrink-0">
              <h2 className="text-base font-semibold">Select a Time</h2>
              {selectedDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <BookingCalendar
                form={{
                  ...eventType,
                  user_id: eventType.user_id,
                  use_custom_availability: eventType.use_custom_availability,
                  email,
                } as any}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onTimeSelect={(time) => setSelectedTime(time)}
                renderCalendar={false}
                renderTimesColumn
              />
              {!emailIsValid && (
                <p className="mt-3 text-sm text-destructive text-center">
                  Enter a valid email address to reveal available times.
                </p>
              )}
            </div>
            <div className="p-4 border-t flex-shrink-0">
              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={
                  submitting ||
                  !selectedDate ||
                  !selectedTime ||
                  !name.trim() ||
                  !emailIsValid
                }
              >
                {submitting ? "Confirming..." : "Confirm Booking"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicBooking;
