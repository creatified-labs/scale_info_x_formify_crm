"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BookingCalendar } from "@/components/forms/BookingCalendar";
import { CheckCircle2, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import { CallTypeSelector } from "@/components/scheduling/CallTypeSelector";
import { InviteeQuestions } from "@/components/scheduling/InviteeQuestions";
import type { EventType } from "@/types/scheduling";
import { useData } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";
import { PoweredByBadge } from "@/components/PoweredByBadge";
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

interface EmbedOption2Props {
  eventType: EventType & { branding_hide_badge?: boolean; user_timezone?: string };
  prefillData?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  embedCustomization?: {
    hideBranding?: boolean;
    primaryColor?: string | null;
    hideHeader?: boolean;
  };
}

export const EmbedOption2 = ({ eventType, prefillData, embedCustomization }: EmbedOption2Props) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState(prefillData?.name || "");
  const [email, setEmail] = useState(prefillData?.email || "");
  const [phone, setPhone] = useState(prefillData?.phone || "");
  const [callType, setCallType] = useState<string>("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});
  const { toast } = useToast();
  const { addCall } = useData();
  const emailIsValid = useMemo(() => {
    if (!email) return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }, [email]);
  const [confirmationDetails, setConfirmationDetails] = useState<ConfirmationDetails | null>(null);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (eventType && !callType) {
      setCallType(eventType.default_call_type);
    }
  }, [eventType]);

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

  const questions = eventType.invitee_form_schema || [];
  const totalSteps = 2 + questions.length;

  const canProceed = () => {
    if (currentStep === 0) {
      return name.trim().length > 0 && emailIsValid;
    }
    
    if (currentStep > 0 && currentStep <= questions.length) {
      const question = questions[currentStep - 1];
      const answer = questionAnswers[question.id];
      if (question.required) {
        return answer && answer.toString().trim().length > 0;
      }
      return true;
    }
    
    if (currentStep === totalSteps - 1) {
      return selectedDate !== null && selectedTime !== null;
    }
    
    return true;
  };

  const handleNext = () => {
    if (canProceed() && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!eventType || !selectedDate || !selectedTime || !callType) return;

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

    if (callType === 'phone' && eventType.phone_required_for_phone_type && !phone) {
      toast({
        title: "Error",
        description: "Phone number is required for phone calls",
        variant: "destructive",
      });
      return;
    }

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
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startTime = parseTimeInTimezone(selectedDate, selectedTime, browserTimezone);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + eventType.duration_minutes);

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

      let finalJoinUrl = joinUrl;
      if (meetLink && (callType === 'zoom' || callType === 'google_meet')) {
        finalJoinUrl = meetLink;
      } else if (callType !== 'zoom' && callType !== 'google_meet') {
        finalJoinUrl = joinUrl;
      }

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

      if (eventType.redirect_url) {
        window.location.href = eventType.redirect_url;
        return;
      }

      setSubmitted(true);
      setConfirmationDetails(confirmation);

      // Notify parent window via postMessage
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'booking_completed',
          data: {
            bookingId: createdBookingId,
            eventTypeName: eventType.name,
            inviteeName: name.trim(),
            inviteeEmail: email.trim().toLowerCase(),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            callType,
          }
        }, '*');
      }

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

  if (submitted && confirmationDetails) {
    const startDate = new Date(confirmationDetails.startIso);
    const endDate = new Date(confirmationDetails.endIso);
    const dateLabel = format(startDate, 'EEEE, MMMM d, yyyy');
    const timeLabel = format(startDate, 'h:mm a');
    const endTimeLabel = format(endDate, 'h:mm a');
    const isJoinLink = confirmationDetails.joinUrl?.startsWith('http');

    return (
      <div className={cn("min-h-screen bg-background p-3 lg:p-4 flex items-center justify-center")}> 
        {showBadge && <PoweredByBadge />}
        <Card className="max-w-xl w-full p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <h1 className="text-xl font-semibold">Booking confirmed!</h1>
              <p className="text-sm text-muted-foreground">We've sent details to {confirmationDetails.email}.</p>
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
              <h4 className="text-sm font-semibold">📅 Accept Your Calendar Invite</h4>
              <p className="text-xs text-muted-foreground">
                A calendar invitation with the meeting link has been sent to <span className="font-medium">{confirmationDetails.email}</span>
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Check your email inbox for the calendar invite</li>
                <li>Click "Accept" or "Yes" in the invitation</li>
                <li>The event will be added to your Google Calendar with the meeting link</li>
              </ol>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                className="flex-1" 
                onClick={() => window.open('https://calendar.google.com', '_blank')}
              >
                Check Google Calendar
              </Button>
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => window.location.href = `mailto:${confirmationDetails.email}`}
              >
                Open Email
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

  return (
    <div className={cn("min-h-screen bg-background p-3 lg:p-4 flex items-center justify-center")}> 
      {showBadge && <PoweredByBadge />}
      <div className="max-w-2xl mx-auto w-full">
        <Card className="p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{eventType.name}</h1>
            {eventType.description && (
              <p className="text-sm text-muted-foreground">{eventType.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{eventType.duration_minutes} min</span>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(((currentStep + 1) / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <div className="min-h-[400px]">
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Let's start with your details</h2>
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
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                  {email.length > 0 && !emailIsValid && (
                    <p className="text-sm text-destructive">Enter a valid email address to continue.</p>
                  )}
                </div>
              </div>
            )}

            {currentStep > 0 && currentStep <= questions.length && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Question {currentStep} of {questions.length}</h2>
                <InviteeQuestions
                  questions={[questions[currentStep - 1]]}
                  answers={questionAnswers}
                  onAnswerChange={(questionId, value) =>
                    setQuestionAnswers({ ...questionAnswers, [questionId]: value })
                  }
                />
              </div>
            )}

            {currentStep === totalSteps - 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Select your preferred time</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Select a Date</h3>
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
                  <div>
                    <h3 className="text-sm font-semibold mb-3">
                      {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a Time'}
                    </h3>
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
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-8">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            
            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !canProceed()}
                className="flex-1"
              >
                {submitting ? "Confirming..." : "Confirm Booking"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
