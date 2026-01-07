"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, GripVertical, Check, Star } from "lucide-react";
import { CallType, EventType, InviteeQuestion, NotificationSettings } from "@/types/scheduling";
import { getBookingPathPrefix } from "@/lib/urls";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { EventTypePreview } from "./EventTypePreview";
import { AppearanceSection } from "@/components/calendar/editor-sections/AppearanceSection";
import { TimeBlocksEditor } from "./TimeBlocksEditor";
import { getCompanyId } from "@/lib/company";
import { NotificationsSection } from "@/components/calendar/editor-sections/NotificationsSection";
import { AvailabilityScheduleSelector } from "./AvailabilityScheduleSelector";

const createDefaultNotifications = (): NotificationSettings => ({
  email: { enabled: true, confirmation: true, confirmationDelay: 0, reminders: [1440, 60], followup: 0 },
  sms: { enabled: false, confirmation: false, confirmationDelay: 0, reminders: [], followup: 0 },
});

const cloneNotifications = (source?: NotificationSettings | null): NotificationSettings => {
  const base = createDefaultNotifications();
  if (!source) {
    return {
      email: { ...base.email, reminders: [...base.email.reminders] },
      sms: { ...base.sms, reminders: [...base.sms.reminders] },
    };
  }

  return {
    email: {
      ...base.email,
      ...source.email,
      reminders: Array.isArray(source.email?.reminders)
        ? [...source.email.reminders]
        : [...base.email.reminders],
    },
    sms: {
      ...base.sms,
      ...source.sms,
      reminders: Array.isArray(source.sms?.reminders)
        ? [...source.sms.reminders]
        : [...base.sms.reminders],
    },
  };
};

const cloneQuestions = (source?: InviteeQuestion[] | null): InviteeQuestion[] =>
  Array.isArray(source)
    ? source.map((question) => ({
        ...question,
        options: Array.isArray(question.options) ? [...question.options] : undefined,
        correctOptions: Array.isArray(question.correctOptions) ? [...question.correctOptions] : [],
        maxSelections: typeof question.maxSelections === "number" ? question.maxSelections : null,
        quizMode: Boolean(question.quizMode),
      }))
    : [];

const serializeQuestionsForSave = (questions: InviteeQuestion[]): InviteeQuestion[] => {
  return questions.map((question, index) => {
    const idBase =
      typeof question.id === "string" && question.id.trim().length > 0
        ? question.id.trim()
        : `q_${Date.now()}_${index}`;
    const type = question.type || "short_text";

    const normalized: InviteeQuestion = {
      id: idBase,
      type,
      label: question.label ?? "",
      required: Boolean(question.required),
      placeholder: question.placeholder ?? undefined,
      helper_text: question.helper_text ?? undefined,
      options: undefined,
    };

    let normalizedOptions: string[] | undefined;
    if (["dropdown", "multi_select", "checkbox"].includes(type)) {
      normalizedOptions = Array.isArray(question.options)
        ? question.options
            .map((option) => (typeof option === "string" ? option : option == null ? "" : String(option)))
            .filter((val) => val.trim().length > 0)
        : [];
      if (normalizedOptions.length) {
        normalized.options = normalizedOptions;
      }
    }

    if (type === "multi_select") {
      const maxSelections = typeof question.maxSelections === "number" && question.maxSelections > 0
        ? question.maxSelections
        : null;
      if (maxSelections) {
        (normalized as InviteeQuestion).maxSelections = maxSelections;
      }
    }

    if (type === "checkbox") {
      const quizMode = Boolean(question.quizMode);
      if (quizMode) {
        (normalized as InviteeQuestion).quizMode = true;
        if (normalizedOptions?.length) {
          const validCorrect = (question.correctOptions || []).filter((opt) => normalizedOptions!.includes(opt));
          if (validCorrect.length) {
            (normalized as InviteeQuestion).correctOptions = validCorrect;
          }
        }
      }
    }

    if (!normalized.placeholder) delete normalized.placeholder;
    if (!normalized.helper_text) delete normalized.helper_text;
    if (!normalized.options?.length) delete normalized.options;
    if (normalized.maxSelections == null) delete normalized.maxSelections;
    if (!(normalized as InviteeQuestion).quizMode) delete (normalized as InviteeQuestion).quizMode;
    if (!(normalized as InviteeQuestion).correctOptions?.length) delete (normalized as InviteeQuestion).correctOptions;

    return normalized;
  });
};

interface EventTypeEditorProps {
  eventType: EventType | null;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
  initialTab?: "basics" | "call-types" | "questions" | "notifications" | "confirmation" | "appearance" | "time-blocks" | "preview";
}

export const EventTypeEditor = ({ eventType, onClose, onSaved, initialTab = "basics" }: EventTypeEditorProps) => {
  const [name, setName] = useState(eventType?.name || "");
  const [slug, setSlug] = useState(eventType?.slug || "");
  const [description, setDescription] = useState(eventType?.description || "");
  const [duration, setDuration] = useState(
    eventType?.duration_minutes != null ? String(eventType.duration_minutes) : "30"
  );
  const initialAllowed = useMemo<CallType[]>(() => {
    if (eventType?.allowed_call_types && eventType.allowed_call_types.length > 0) {
      return eventType.allowed_call_types as CallType[];
    }
    const fallback = eventType?.default_call_type || eventType?.location_type;
    return [fallback ?? "google_meet"] as CallType[];
  }, [eventType?.allowed_call_types, eventType?.default_call_type, eventType?.location_type]);

  const [allowedCallTypes, setAllowedCallTypes] = useState<CallType[]>(initialAllowed);
  const [defaultCallType, setDefaultCallType] = useState<CallType>(
    eventType?.default_call_type || initialAllowed[0] || "google_meet"
  );
  const [phoneRequired, setPhoneRequired] = useState(eventType?.phone_required_for_phone_type || false);
  const [inPersonLocation, setInPersonLocation] = useState(eventType?.inperson_location || "");
  const [customLinkLabel, setCustomLinkLabel] = useState(eventType?.custom_link_label || "");
  const [customLinkUrl, setCustomLinkUrl] = useState(eventType?.custom_link_url || "");
  const [minNotice, setMinNotice] = useState(
    eventType?.min_notice_hours != null ? String(eventType.min_notice_hours) : "24"
  );
  const [bufferBefore, setBufferBefore] = useState(
    eventType?.buffer_before != null ? String(eventType.buffer_before) : "0"
  );
  const [bufferAfter, setBufferAfter] = useState(
    eventType?.buffer_after != null ? String(eventType.buffer_after) : "0"
  );
  const [availabilityScheduleId, setAvailabilityScheduleId] = useState<string | undefined>(
    eventType?.availability_schedule_id
  );
  const [questions, setQuestions] = useState<InviteeQuestion[]>(
    cloneQuestions(eventType?.invitee_form_schema)
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>(
    cloneNotifications(eventType?.notifications as NotificationSettings | undefined)
  );
  const [templates, setTemplates] = useState({
    email: {
      confirmation: { 
        subject: (eventType as any)?.templates?.email?.confirmation?.subject || "Booking Confirmed: {event_name}", 
        body: (eventType as any)?.templates?.email?.confirmation?.body || "Hi {invitee_name},\n\nYour booking for {event_name} is confirmed!\n\nDate: {event_date}\nTime: {event_time}\nJoin: {join_url}\n\nLooking forward to meeting you!" 
      },
      reminder: { 
        subject: (eventType as any)?.templates?.email?.reminder?.subject || "Reminder: {event_name} in {offset}", 
        body: (eventType as any)?.templates?.email?.reminder?.body || "Hi {invitee_name},\n\nThis is a reminder that your meeting {event_name} is coming up.\n\nDate: {event_date}\nTime: {event_time}\nJoin: {join_url}\n\nSee you soon!" 
      },
      followup: { 
        subject: (eventType as any)?.templates?.email?.followup?.subject || "Thank you for meeting!", 
        body: (eventType as any)?.templates?.email?.followup?.body || "Hi {invitee_name},\n\nThank you for taking the time to meet with us. We appreciate it!\n\nBest regards" 
      }
    },
    sms: {
      confirmation: (eventType as any)?.templates?.sms?.confirmation || "Your booking for {event_name} on {event_date} at {event_time} is confirmed.",
      reminder: (eventType as any)?.templates?.sms?.reminder || "Reminder: {event_name} in {offset}. Join: {join_url}",
      followup: (eventType as any)?.templates?.sms?.followup || "Thank you for meeting with us!"
    }
  });
  const [saving, setSaving] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(eventType?.theme_mode as any || 'auto');
  const [successMessage, setSuccessMessage] = useState((eventType as any)?.success_message || "");
  const [redirectUrl, setRedirectUrl] = useState(eventType?.redirect_url || "");
  const [redirectButtonText, setRedirectButtonText] = useState((eventType as any)?.redirect_button_text || "Continue");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [recentlySavedQuestionId, setRecentlySavedQuestionId] = useState<string | null>(null);
  const bookingPrefix = getBookingPathPrefix();
  const { toast } = useToast();
  const { entitlements } = useEntitlements();
  const saveIndicatorTimeoutRef = useRef<number | null>(null);
  const router = useRouter();

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60);
  };

  const handleCallTypeToggle = (type: CallType) => {
    if (allowedCallTypes.includes(type)) {
      const updated = allowedCallTypes.filter(t => t !== type);
      setAllowedCallTypes(updated);
      if (defaultCallType === type && updated.length > 0) {
        setDefaultCallType(updated[0]);
      }
    } else {
      const updated = [...allowedCallTypes, type];
      setAllowedCallTypes(updated);
      if (!defaultCallType) {
        setDefaultCallType(type);
      }
    }
  };

  useEffect(() => {
    setName(eventType?.name || "");
    setSlug(eventType?.slug || "");
    setDescription(eventType?.description || "");
    setDuration(eventType?.duration_minutes != null ? String(eventType.duration_minutes) : "30");

    const allowed = eventType?.allowed_call_types && eventType.allowed_call_types.length > 0
      ? (eventType.allowed_call_types as CallType[]).map((type) => type)
      : ([eventType?.default_call_type || eventType?.location_type || "google_meet"] as CallType[]);
    setAllowedCallTypes(allowed);
    setDefaultCallType(eventType?.default_call_type || allowed[0] || "google_meet");
    setPhoneRequired(Boolean(eventType?.phone_required_for_phone_type));
    setInPersonLocation(eventType?.inperson_location || "");
    setCustomLinkLabel(eventType?.custom_link_label || "");
    setCustomLinkUrl(eventType?.custom_link_url || "");
    setMinNotice(eventType?.min_notice_hours != null ? String(eventType.min_notice_hours) : "24");
    setBufferBefore(eventType?.buffer_before != null ? String(eventType.buffer_before) : "0");
    setBufferAfter(eventType?.buffer_after != null ? String(eventType.buffer_after) : "0");
    setAvailabilityScheduleId(eventType?.availability_schedule_id);
    setQuestions(cloneQuestions(eventType?.invitee_form_schema));
    setNotifications(cloneNotifications(eventType?.notifications as NotificationSettings | undefined));
    setThemeMode((eventType?.theme_mode as any) || 'auto');
    setSuccessMessage((eventType as any)?.success_message || "");
    setRedirectUrl(eventType?.redirect_url || "");
    setRedirectButtonText((eventType as any)?.redirect_button_text || "Continue");
  }, [eventType]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, eventType?.id]);

  useEffect(() => {
    if (!allowedCallTypes.includes(defaultCallType)) {
      if (allowedCallTypes.length > 0) {
        setDefaultCallType(allowedCallTypes[0]);
      }
    }
  }, [allowedCallTypes, defaultCallType]);

  useEffect(() => {
    return () => {
      if (saveIndicatorTimeoutRef.current) {
        clearTimeout(saveIndicatorTimeoutRef.current);
      }
    };
  }, []);

  const plan = entitlements.plan_id;
  const soloLimit = 3;
  const isPreview = plan === "preview";
  const isSolo = plan === "solo";
  const hasReachedSoloLimit = isSolo && questions.length >= soloLimit;
  const inviteeQuestionsDisabled = isPreview;

  const addQuestion = () => {
    if (inviteeQuestionsDisabled) {
      toast({
        title: "Upgrade to add questions",
        description: "Free workspaces can’t add invitee questions yet. Upgrade to Solo or Pro to unlock this feature.",
        variant: "destructive",
      });
      router.push("/pricing");
      return;
    }
    if (hasReachedSoloLimit) {
      toast({
        title: "Solo plan limit",
        description: "Solo workspaces can add up to three questions. Upgrade to Pro for unlimited questions.",
        variant: "destructive",
      });
      router.push("/pricing");
      return;
    }
    const newQuestion: InviteeQuestion = {
      id: `q_${Date.now()}`,
      type: 'short_text',
      label: 'New Question',
      required: false,
      options: undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<InviteeQuestion>) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        const updated = { ...q, ...updates };
        // Initialize options array when switching to option-based question types
        if (updates.type && ['dropdown', 'multi_select', 'checkbox'].includes(updates.type)) {
          updated.options = Array.isArray(updated.options) ? [...updated.options] : [];
        }
        if (!updates.type && updated.type && ['dropdown', 'multi_select', 'checkbox'].includes(updated.type) && !updated.options) {
          updated.options = [];
        }
        return updated;
      }
      return q;
    }));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newQuestions = [...questions];
    const draggedItem = newQuestions[draggedIndex];
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(index, 0, draggedItem);
    
    setQuestions(newQuestions);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const persistEventType = async ({ closeAfterSave = true, questionId }: { closeAfterSave?: boolean; questionId?: string } = {}) => {
    if (!name || !slug) {
      toast({
        title: "Error",
        description: "Name and slug are required",
        variant: "destructive",
      });
      return;
    }

    if (allowedCallTypes.length === 0) {
      toast({
        title: "Error",
        description: "At least one call type must be selected",
        variant: "destructive",
      });
      return;
    }

    if (closeAfterSave) {
      setSaving(true);
    } else {
      setSavingQuestionId(questionId ?? "__all__");
    }

    try {
      const eventData = {
        name,
        slug,
        description,
        duration_minutes: parseInt(duration),
        location_type: defaultCallType,
        allowed_call_types: allowedCallTypes,
        default_call_type: defaultCallType,
        min_notice_hours: parseInt(minNotice),
        buffer_before: parseInt(bufferBefore),
        buffer_after: parseInt(bufferAfter),
        availability_schedule_id: availabilityScheduleId || null,
        phone_required_for_phone_type: phoneRequired,
        inperson_location: inPersonLocation,
        custom_link_label: customLinkLabel,
        custom_link_url: customLinkUrl,
        invitee_form_schema: serializeQuestionsForSave(questions),
        notifications: notifications as any,
        templates: templates as any,
        theme_mode: themeMode,
        success_message: successMessage,
        redirect_url: redirectUrl || null,
        redirect_button_text: redirectButtonText || "Continue",
      };

      const parseResponse = async (res: Response, action: "create" | "update") => {
        // Clone response to read it multiple times
        const resClone = res.clone();
        const rawText = await resClone.text();
        console.log(`Event type ${action} raw response:`, {
          status: res.status,
          statusText: res.statusText,
          rawText: rawText.substring(0, 500),
          contentType: res.headers.get('content-type')
        });
        
        const payload = await res.json().catch((e) => {
          console.error('Failed to parse JSON:', e, 'Raw text:', rawText);
          return null;
        });
        
        if (!res.ok) {
          console.error(`Event type ${action} failed:`, {
            status: res.status,
            statusText: res.statusText,
            payload,
            headers: Object.fromEntries(res.headers.entries())
          });
          const detail = payload?.detail ? `: ${payload.detail}` : "";
          const details = payload?.details ? ` (${payload.details})` : "";
          const errorMessage = payload?.error
            ? `${payload.error}${detail}${details}`
            : `Failed to ${action} event type${detail}`;
          throw new Error(errorMessage);
        }
        return (payload?.event_type as EventType | null) ?? null;
      };

      const companyId = await getCompanyId();
      if (!companyId) {
        throw new Error("No company ID available. Please refresh to re-authenticate.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No user found. Please refresh to re-authenticate.");
      }

      const callEdgeFunction = async (functionName: string, payload: Record<string, unknown>, action: "create" | "update") => {
        const res = await fetch('/api/edge-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            functionName,
            payload: {
              ...payload,
              company_id: companyId,
              user_id: user.id,
            },
            method: 'POST',
          }),
        });
        return parseResponse(res, action);
      };

      let updatedEventType: EventType | null = null;
      if (eventType) {
        updatedEventType = await callEdgeFunction(
          'update-event-type',
          { id: eventType.id, ...eventData },
          'update'
        );
      } else {
        updatedEventType = await callEdgeFunction(
          'create-event-type',
          eventData,
          'create'
        );
      }

      if (!closeAfterSave) {
        toast({
          title: "Question saved",
          description: "Invitee question saved successfully",
        });
        if (updatedEventType?.invitee_form_schema) {
          setQuestions(cloneQuestions(updatedEventType.invitee_form_schema));
        }
        if (questionId) {
          setRecentlySavedQuestionId(questionId);
          if (saveIndicatorTimeoutRef.current) {
            clearTimeout(saveIndicatorTimeoutRef.current);
          }
          saveIndicatorTimeoutRef.current = window.setTimeout(() => {
            setRecentlySavedQuestionId((current) => (current === questionId ? null : current));
          }, 2000);
        }
      } else {
        toast({
          title: "Success",
          description: `Event type ${eventType ? "updated" : "created"} successfully`,
        });
        if (onSaved) {
          await onSaved();
        }
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (closeAfterSave) {
        setSaving(false);
      } else {
        setSavingQuestionId(null);
      }
    }
  };

  const handleSave = async () => {
    await persistEventType();
  };

  const handleQuestionSave = async (questionId: string) => {
    if (!eventType) {
      toast({
        title: "Save event first",
        description: "Please save the event type before saving questions individually.",
        variant: "destructive",
      });
      return;
    }
    await persistEventType({ closeAfterSave: false, questionId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            {eventType ? "Edit Event Type" : "Create Event Type"}
          </h2>
          <p className="text-muted-foreground">
            Configure your event type settings
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="call-types">Call Types</TabsTrigger>
          <TabsTrigger value="questions">
            {inviteeQuestionsDisabled ? "Upgrade to Solo or Pro" : "Questions"}
            {hasReachedSoloLimit && !inviteeQuestionsDisabled && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                Upgrade
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="confirmation">Confirmation</TabsTrigger>
          <TabsTrigger value="time-blocks">Time Blocks</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-4 mt-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setName(nextName);
                    if (!eventType) {
                      setSlug(generateSlug(nextName));
                    }
                  }}
                  placeholder="30 Minute Meeting"
                />
              </div>

              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground break-all">{bookingPrefix}</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="30min"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of this event type"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="minNotice">Min Notice (hours)</Label>
                  <Input
                    id="minNotice"
                    type="number"
                    value={minNotice}
                    onChange={(e) => setMinNotice(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="bufferBefore">Buffer Before (min)</Label>
                  <Input
                    id="bufferBefore"
                    type="number"
                    value={bufferBefore}
                    onChange={(e) => setBufferBefore(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="bufferAfter">Buffer After (min)</Label>
                  <Input
                    id="bufferAfter"
                    type="number"
                    value={bufferAfter}
                    onChange={(e) => setBufferAfter(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="availabilitySchedule">Availability Schedule</Label>
                <AvailabilityScheduleSelector
                  value={availabilityScheduleId}
                  onChange={setAvailabilityScheduleId}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select which availability schedule to use for this event type
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="call-types" className="space-y-4 mt-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Allowed Call Types</h3>
                <div className="space-y-3">
                  {(['zoom', 'google_meet', 'phone', 'in_person', 'custom'] as CallType[]).map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={allowedCallTypes.includes(type)}
                        onCheckedChange={() => handleCallTypeToggle(type)}
                      />
                      <label htmlFor={type} className="text-sm font-medium capitalize cursor-pointer">
                        {type.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {allowedCallTypes.length > 0 && (
                <div>
                  <Label htmlFor="defaultCallType">Default Call Type</Label>
                  <Select value={defaultCallType} onValueChange={(v) => setDefaultCallType(v as CallType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedCallTypes.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {allowedCallTypes.includes('phone') && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="phoneRequired"
                    checked={phoneRequired}
                    onCheckedChange={setPhoneRequired}
                  />
                  <Label htmlFor="phoneRequired">Require phone number for phone calls</Label>
                </div>
              )}

              {allowedCallTypes.includes('in_person') && (
                <div>
                  <Label htmlFor="inPersonLocation">In-Person Location</Label>
                  <Input
                    id="inPersonLocation"
                    value={inPersonLocation}
                    onChange={(e) => setInPersonLocation(e.target.value)}
                    placeholder="123 Main St, City, State"
                  />
                </div>
              )}

              {allowedCallTypes.includes('custom') && (
                <>
                  <div>
                    <Label htmlFor="customLinkLabel">Custom Link Label</Label>
                    <Input
                      id="customLinkLabel"
                      value={customLinkLabel}
                      onChange={(e) => setCustomLinkLabel(e.target.value)}
                      placeholder="Custom Meeting Link"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customLinkUrl">Custom Link URL</Label>
                    <Input
                      id="customLinkUrl"
                      value={customLinkUrl}
                      onChange={(e) => setCustomLinkUrl(e.target.value)}
                      placeholder="https://example.com/meeting"
                    />
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4 mt-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Invitee Questions</h3>
                <Button
                  onClick={inviteeQuestionsDisabled || hasReachedSoloLimit ? () => {
                    if (inviteeQuestionsDisabled) {
                      toast({
                        title: "Upgrade to add questions",
                        description:
                          "Free workspaces can’t add invitee questions yet. Upgrade to Solo or Pro to unlock this feature.",
                        variant: "destructive",
                      });
                    } else {
                      toast({
                        title: "Upgrade for more questions",
                        description: "Solo workspaces can add up to three questions. Upgrade to Pro for unlimited questions.",
                        variant: "destructive",
                      });
                    }
                    router.push("/pricing");
                  } : addQuestion}
                  size="sm"
                  variant={inviteeQuestionsDisabled || hasReachedSoloLimit ? "secondary" : "default"}
                  disabled={inviteeQuestionsDisabled}
                >
                  {inviteeQuestionsDisabled || hasReachedSoloLimit ? (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Upgrade to add questions
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </>
                  )}
                </Button>
              </div>
              <div className={`grid gap-4 ${inviteeQuestionsDisabled ? "pointer-events-none opacity-60" : ""}`}>
                {questions.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <p className="text-sm text-muted-foreground">
                      {inviteeQuestionsDisabled
                        ? "Upgrade to Solo or Pro to add custom invitee questions."
                        : "No custom questions yet. Click \"Add Question\" to get started."}
                    </p>
                  </div>
                ) : (
                  questions.map((question, index) => (
                    <Card
                      key={question.id}
                      className="p-4 cursor-move"
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 mt-2 text-muted-foreground cursor-grab active:cursor-grabbing" />
                          <div className="flex-1 space-y-3">
                            <Input
                              value={question.label}
                              onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                              placeholder="Question text"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={question.type}
                                onValueChange={(v) => updateQuestion(question.id, { type: v as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="short_text">Short Text</SelectItem>
                                  <SelectItem value="long_text">Long Text</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="phone">Phone</SelectItem>
                                  <SelectItem value="dropdown">Dropdown</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                  <SelectItem value="multi_select">Multi-Select</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                value={question.placeholder || ""}
                                onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                                placeholder="Placeholder text"
                              />
                            </div>
                            {(["dropdown", "multi_select", "checkbox"].includes(question.type)) && (
                              <div className="space-y-2">
                                <Label className="text-xs">Options</Label>
                                {(question.options ?? []).map((option, idx) => (
                                  <div key={idx} className="flex gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...(question.options ?? [])];
                                        newOptions[idx] = e.target.value;
                                        updateQuestion(question.id, { options: newOptions });
                                      }}
                                      placeholder={`Option ${idx + 1}`}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newOptions = (question.options ?? []).filter((_, i) => i !== idx);
                                        updateQuestion(question.id, { options: newOptions.length ? newOptions : [] });
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = [...(question.options ?? []), ""];
                                    updateQuestion(question.id, { options: newOptions });
                                  }}
                                  className="w-full"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Option
                                </Button>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={question.required}
                                  onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                                />
                                <Label>Required</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!eventType || savingQuestionId === question.id}
                                  onClick={() => handleQuestionSave(question.id)}
                                >
                                  {savingQuestionId === question.id ? "Saving..." : "Save Question"}
                                </Button>
                                {recentlySavedQuestionId === question.id && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-500">
                                    <Check className="w-3 h-3" /> Saved
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(question.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card className="p-6">
            <NotificationsSection 
              data={{
                notifications,
                templates
              }} 
              onChange={(updates) => {
                if (updates.notifications) {
                  setNotifications(updates.notifications);
                }
                if (updates.templates) {
                  setTemplates(updates.templates);
                }
              }} 
            />
          </Card>
        </TabsContent>

        <TabsContent value="confirmation" className="space-y-4 mt-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">After Booking</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="successMessage">Success Message</Label>
                    <Textarea
                      id="successMessage"
                      value={successMessage}
                      onChange={(e) => setSuccessMessage(e.target.value)}
                      placeholder="Thank you for booking! We look forward to meeting with you."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This message will be shown on the confirmation page
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
                    <Input
                      id="redirectUrl"
                      type="url"
                      value={redirectUrl}
                      onChange={(e) => setRedirectUrl(e.target.value)}
                      placeholder="https://example.com/thank-you"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      If set, a button will appear on the confirmation page to redirect users
                    </p>
                  </div>

                  {redirectUrl && (
                    <div>
                      <Label htmlFor="redirectButtonText">Button Text</Label>
                      <Input
                        id="redirectButtonText"
                        type="text"
                        value={redirectButtonText}
                        onChange={(e) => setRedirectButtonText(e.target.value)}
                        placeholder="Continue"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Customize the text shown on the redirect button
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="time-blocks" className="mt-6">
          {eventType && (
            <TimeBlocksEditor
              userId={eventType.user_id}
              scope="event_only"
              eventTypeId={eventType.id}
            />
          )}
          {!eventType && (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                Save this event type first to configure time blocks
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <EventTypePreview
            name={name}
            description={description}
            duration={duration}
            allowedCallTypes={allowedCallTypes}
            defaultCallType={defaultCallType}
            phoneRequired={phoneRequired}
            inPersonLocation={inPersonLocation}
            customLinkLabel={customLinkLabel}
            questions={questions}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Event Type"}
        </Button>
      </div>
    </div>
  );
};
