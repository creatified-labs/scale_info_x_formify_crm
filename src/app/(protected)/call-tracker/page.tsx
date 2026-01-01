"use client";
import Link from "next/link";
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  List,
  Calendar as CalendarIcon,
  Plus,
  Loader2,
  Info,
  Link as LinkIcon,
  Video,
  Phone,
  MapPin,
  Clock as ClockIcon,
} from "lucide-react";
import CalendarView from "@/components/CalendarView";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { PlanGate } from "@/components/PlanGate";
import { BookingsList } from "@/components/scheduling/BookingsList";
import { supabase } from "@/integrations/supabase/client";
import type { EventType, InviteeQuestion, CallType } from "@/types/scheduling";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BookingCalendar } from "@/components/forms/BookingCalendar";
import { InviteeQuestions } from "@/components/scheduling/InviteeQuestions";
import { CallTypeSelector } from "@/components/scheduling/CallTypeSelector";
import { format } from "date-fns";
import { getCompanyId } from "@/lib/company";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const parseTimeLabel = (label: string) => {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }
  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
};

const CallTracker = () => {
  const { entitlements } = useEntitlements();
  const hasCallTracking = entitlements.plan_id !== "preview";
  const { toast } = useToast();

  const [events, setEvents] = useState<EventType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [inviteeName, setInviteeName] = useState("");
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [inviteePhone, setInviteePhone] = useState("");
  const [selectedCallType, setSelectedCallType] = useState<CallType | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string | string[] | boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  useEffect(() => {
    if (!hasCallTracking) return;

    let cancelled = false;

    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const companyId = await getCompanyId();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id ?? null;

        let fetched: EventType[] = [];
        let lastError: Error | null = null;

        if (companyId) {
          const { data, error } = await supabase
            .from("event_types")
            .select("*")
            .eq("company_id", companyId)
            .eq("is_active", true)
            .eq("is_archived", false)
            .is("deleted_at", null)
            .order("created_at", { ascending: false });
          if (!error && data && data.length > 0) {
            fetched = data as EventType[];
          } else if (error) {
            lastError = error;
          }
        }

        if (!fetched.length && userId) {
          const { data, error } = await supabase
            .from("event_types")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .eq("is_archived", false)
            .is("deleted_at", null)
            .order("created_at", { ascending: false });
          if (error) {
            lastError = error;
          } else {
            fetched = (data || []) as EventType[];
          }
        }

        if (lastError) {
          throw lastError;
        }

        if (!cancelled) setEvents(fetched);
      } catch (error) {
        console.error("Failed to load event types", error);
        if (!cancelled) {
          toast({
            title: "Unable to load events",
            description: "Try again shortly.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    };

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [hasCallTracking, toast]);

  const resetDetailsState = () => {
    setSelectedEvent(null);
    setInviteeName("");
    setInviteeEmail("");
    setInviteePhone("");
    setSelectedCallType(null);
    setQuestionAnswers({});
    setSelectedDate(null);
    setSelectedTime(null);
    setSubmittingBooking(false);
  };

  const handleEventSelect = (event: EventType) => {
    setSelectedEvent(event);
    setInviteeName("");
    setInviteeEmail("");
    setInviteePhone("");
    setSelectedCallType(event.default_call_type);
    setQuestionAnswers({});
    setSelectedDate(null);
    setSelectedTime(null);
    setIsEventDialogOpen(false);
    setIsDetailsDialogOpen(true);
  };

  const handleDetailsClose = () => {
    setIsDetailsDialogOpen(false);
    resetDetailsState();
  };

  const handleQuestionAnswerChange = (questionId: string, value: string | string[] | boolean) => {
    setQuestionAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const validateQuestions = (questions: InviteeQuestion[]) => {
    for (const question of questions) {
      if (!question.required) continue;
      const answer = questionAnswers[question.id];

      switch (question.type) {
        case "multi_select":
          if (!Array.isArray(answer) || answer.length === 0) {
            return question.label;
          }
          break;
        case "checkbox":
          if (!answer) {
            return question.label;
          }
          break;
        default:
          if (!answer || String(answer).trim().length === 0) {
            return question.label;
          }
      }
    }
    return null;
  };

  const handleConfirmManualCall = async () => {
    if (!selectedEvent) {
      toast({ title: "Select an event", variant: "destructive" });
      return;
    }

    const trimmedName = inviteeName.trim();
    const trimmedEmail = inviteeEmail.trim().toLowerCase();
    const trimmedPhone = inviteePhone.trim();
    const callType = selectedCallType ?? selectedEvent.default_call_type;

    if (!trimmedName) {
      toast({ title: "Name required", description: "Enter the invitee's name.", variant: "destructive" });
      return;
    }
    if (trimmedName.length > 100) {
      toast({ title: "Name too long", description: "Name must be under 100 characters.", variant: "destructive" });
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      toast({ title: "Valid email required", description: "Enter a valid invitee email.", variant: "destructive" });
      return;
    }
    if (trimmedEmail.length > 255) {
      toast({ title: "Email too long", description: "Email must be under 255 characters.", variant: "destructive" });
      return;
    }
    if (callType === "phone" && selectedEvent.phone_required_for_phone_type && !trimmedPhone) {
      toast({ title: "Phone required", description: "This event requires a phone number.", variant: "destructive" });
      return;
    }
    if (trimmedPhone.length > 20) {
      toast({ title: "Phone too long", description: "Phone numbers must be under 20 characters.", variant: "destructive" });
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast({ title: "Pick a slot", description: "Choose a date and time.", variant: "destructive" });
      return;
    }

    const missingQuestion = validateQuestions(selectedEvent.invitee_form_schema || []);
    if (missingQuestion) {
      toast({
        title: "Answer required",
        description: `Please provide an answer for "${missingQuestion}"`,
        variant: "destructive",
      });
      return;
    }

    const parsedTime = parseTimeLabel(selectedTime);
    if (!parsedTime) {
      toast({ title: "Invalid time", description: "Select a valid time slot.", variant: "destructive" });
      return;
    }

    const start = new Date(selectedDate);
    start.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    const end = new Date(start.getTime() + (selectedEvent.duration_minutes ?? 30) * 60000);

    const payload: Record<string, unknown> = {
      event_type_id: selectedEvent.id,
      invitee_name: trimmedName.substring(0, 100),
      invitee_email: trimmedEmail.substring(0, 255),
      invitee_phone: trimmedPhone ? trimmedPhone.substring(0, 20) : null,
      invitee_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "scheduled",
      chosen_call_type: callType,
      answers: questionAnswers,
      manual_booking: true,
    };

    if (callType === "zoom" || callType === "google_meet") {
      payload.video_join_url = "Meeting link will be sent by host";
      payload.provider_pending = true;
    }
    if (callType === "in_person") {
      payload.location_text = selectedEvent.inperson_location ?? "Location to be confirmed";
    }
    if (callType === "custom") {
      payload.video_join_url = selectedEvent.custom_link_url ?? null;
      payload.location_text = selectedEvent.custom_link_label ?? null;
    }

    try {
      setSubmittingBooking(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error || "Unable to create manual call");
      }

      toast({ title: "Manual call scheduled" });
      handleDetailsClose();
      setIsEventDialogOpen(false);
      window.dispatchEvent(new Event("call-tracker-refresh"));
      window.dispatchEvent(new Event("bookings-refresh"));
    } catch (error: unknown) {
      console.error("Error creating manual call", error);
      toast({
        title: "Failed to create manual call",
        description:
          error instanceof Error ? error.message : "Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <PlanGate isAllowed={hasCallTracking} featureName="Call Tracking">
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs defaultValue="table" className="space-y-6">
            <TabsList className="tabs-list-enhanced">
              <TabsTrigger value="table" className="tab-trigger-enhanced gap-2">
                <List className="w-4 h-4" />
                Call Table
              </TabsTrigger>
              <TabsTrigger value="calendar" className="tab-trigger-enhanced gap-2">
                <CalendarIcon className="w-4 h-4" />
                Calendar View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <BookingsList
                extraActions={
                  <Button onClick={() => setIsEventDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Call
                  </Button>
                }
              />
            </TabsContent>

            <TabsContent value="calendar">
              <CalendarView />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select an event type</DialogTitle>
            <DialogDescription>
              Choose an event to base the manual call on. Only active events are listed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ScrollArea className="max-h-[480px] pr-4">
              {loadingEvents ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No event types found. Create an event in Scheduling to log calls manually.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {events.map((event) => {
                    const virtualTypes = (event.allowed_call_types || []).filter((type) =>
                      ["zoom", "google_meet", "custom"].includes(type)
                    );
                    const hasPhone = (event.allowed_call_types || []).includes("phone");
                    const hasInPerson = (event.allowed_call_types || []).includes("in_person");

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventSelect(event)}
                        className="text-left rounded-xl border bg-card hover:bg-card/80 transition-colors px-4 py-3 shadow-sm"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-sm font-medium line-clamp-1">{event.name}</span>
                              {event.description ? (
                                <span className="text-xs text-muted-foreground line-clamp-2">{event.description}</span>
                              ) : null}
                            </div>
                            <Badge variant="secondary">{event.duration_minutes} min</Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {virtualTypes.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Video className="w-3 h-3" /> Virtual
                              </span>
                            )}
                            {hasPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Phone
                              </span>
                            )}
                            {hasInPerson && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> In person
                              </span>
                            )}
                            {event.custom_link_url && (
                              <span className="flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" /> Custom link
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailsDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleDetailsClose();
          } else {
            setIsDetailsDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review event details</DialogTitle>
            <DialogDescription>
              Confirm the invitee details and pick a slot. This mirrors the public booking experience.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Event</h3>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{selectedEvent.name}</div>
                        {selectedEvent.description ? (
                          <p className="text-xs text-muted-foreground mt-1">{selectedEvent.description}</p>
                        ) : null}
                      </div>
                      <Badge variant="outline">{selectedEvent.duration_minutes} min</Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick a date"}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {selectedTime || "Pick a time"}
                      </span>
                      {selectedEvent.custom_link_url ? (
                        <a
                          href={selectedEvent.custom_link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {selectedEvent.custom_link_label || "Custom link"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual-invitee-name">Invitee name</Label>
                    <Input
                      id="manual-invitee-name"
                      placeholder="Name"
                      value={inviteeName}
                      onChange={(event) => setInviteeName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-invitee-email">Invitee email</Label>
                    <Input
                      id="manual-invitee-email"
                      type="email"
                      placeholder="name@example.com"
                      value={inviteeEmail}
                      onChange={(event) => setInviteeEmail(event.target.value)}
                    />
                  </div>
                  <CallTypeSelector
                    allowedTypes={(selectedEvent.allowed_call_types?.length
                      ? (selectedEvent.allowed_call_types as CallType[])
                      : [selectedEvent.default_call_type]) as CallType[]}
                    selectedType={selectedCallType ?? selectedEvent.default_call_type}
                    onTypeChange={setSelectedCallType}
                    onPhoneChange={setInviteePhone}
                    phoneValue={inviteePhone}
                    phoneRequired={Boolean(selectedEvent.phone_required_for_phone_type)}
                    inPersonLocation={selectedEvent.inperson_location ?? undefined}
                    customLinkLabel={selectedEvent.custom_link_label ?? undefined}
                    customLinkUrl={selectedEvent.custom_link_url ?? undefined}
                  />
                </div>

                {selectedEvent.invitee_form_schema && selectedEvent.invitee_form_schema.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      Additional questions
                    </div>
                    <InviteeQuestions
                      questions={selectedEvent.invitee_form_schema as InviteeQuestion[]}
                      answers={questionAnswers}
                      onAnswerChange={handleQuestionAnswerChange}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <BookingCalendar
                  form={{
                    id: selectedEvent.id,
                    user_id: selectedEvent.user_id,
                    duration_minutes: selectedEvent.duration_minutes,
                    use_custom_availability: selectedEvent.use_custom_availability,
                    slug: selectedEvent.slug,
                    product: null,
                    email: inviteeEmail,
                  }}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateSelect={setSelectedDate}
                  onTimeSelect={setSelectedTime}
                />
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Select an event to continue.</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleDetailsClose} disabled={submittingBooking}>
              Cancel
            </Button>
            <Button onClick={handleConfirmManualCall} disabled={submittingBooking || !selectedEvent}>
              {submittingBooking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlanGate>
  );
};

export default CallTracker;
