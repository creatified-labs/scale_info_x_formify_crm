"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Mail, Phone, Video, MapPin, Link as LinkIcon, FileText, Search, Check, X, UserX, RefreshCw, PoundSterling, Undo2, Trash2, Edit, Send, Loader2, Copy } from "lucide-react";
import { Booking } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { normalizeBookingStatus, formatBookingStatus, statusTextColorClass } from "@/lib/status";
import { useTimezone, formatTimeInTimezone } from "@/hooks/use-timezone";

type BookingsListProps = {
  extraActions?: ReactNode;
};

export const BookingsList = ({ extraActions }: BookingsListProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [conversionAmount, setConversionAmount] = useState<string>("");
  const [notesEditDialogOpen, setNotesEditDialogOpen] = useState(false);
  const [editableNotes, setEditableNotes] = useState<string>("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { timezone } = useTimezone();
  const [editForm, setEditForm] = useState({
    invitee_name: "",
    invitee_email: "",
    invitee_phone: "",
    chosen_call_type: "meeting",
    date: "",
    time: "",
    duration_minutes: 30,
    status: "scheduled" as Booking["status"],
    notes: "",
    video_join_url: "",
  });
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<string>("custom");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<{ id: string; name: string; subject: string; body: string }[]>([]);
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sendUpdateEmail, setSendUpdateEmail] = useState(false);
  const [notesEditMode, setNotesEditMode] = useState(false);
  const isLocalhost = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const meetingLinkPlaceholder = "Meeting link will be sent by host";

  const signalCallTrackerRefresh = () => {
    window.dispatchEvent(new Event('call-tracker-refresh'));
  };

  const loadEmailTemplates = useCallback(async () => {
    try {
      const companyId = await getCompanyId({ allowFallback: false });
      if (!companyId) {
        setEmailTemplates([]);
        return;
      }
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, subject, body")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to load email templates", error);
      } else {
        setEmailTemplates((data || []) as any);
      }
    } catch (err) {
      console.error("Email templates load error", err);
    }
  }, []);

  useEffect(() => {
    loadEmailTemplates();
  }, [loadEmailTemplates]);

  const buildTemplateFromPreset = (preset: string, booking: Booking) => {
    const when = booking.start_time ? new Date(booking.start_time) : null;
    const companyName = (booking as any).event_types?.name || "your coach";
    const inviteeName = booking.invitee_name || "there";
    const callDate = when ? when.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : "your call";
    const callTime = when ? when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
    const joinLink = (booking as any).video_join_url as string | undefined;

    if (preset === "follow_up") {
      const subject = `Thanks for your call with ${companyName}`;
      const lines = [
        `Hi ${inviteeName},`,
        "",
        `Thanks again for speaking with us. If you have any questions or want to review next steps, just reply to this email.`,
        "",
        "Speak soon,",
        companyName,
      ];
      return { subject, body: lines.join("\n") };
    }

    // default reminder-style template
    const subject = `Reminder: your call with ${companyName}`;
    const lines: string[] = [
      `Hi ${inviteeName},`,
      "",
      `This is a quick reminder about your upcoming call with ${companyName}.`,
    ];

    if (when) {
      lines.push("", `Date: ${callDate}`, `Time: ${callTime}`);
    }

    if (joinLink) {
      lines.push("", `Join link: ${joinLink}`);
    }

    lines.push(
      "",
      "If you need to reschedule, please use your booking link or contact us through your dashboard.",
      "",
      "Speak soon,",
      companyName,
    );
    return { subject, body: lines.join("\n") };
  };

  const fillTemplateVariables = (text: string, booking: Booking) => {
    const inviteeName = booking.invitee_name || "there";
    const eventName = (booking as any).event_types?.name || "your call";
    const when = booking.start_time ? new Date(booking.start_time) : null;
    const callDate = when
      ? when.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
      : "";
    const callTime = when
      ? when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "";
    const joinLink = (booking as any).video_join_url as string | undefined;
    const location = joinLink || meetingLinkPlaceholder;

    return text
      .replace(/\{\{invitee_name\}\}/g, inviteeName)
      .replace(/\{\{event_name\}\}/g, eventName)
      .replace(/\{\{call_date\}\}/g, callDate)
      .replace(/\{\{call_time\}\}/g, callTime)
      .replace(/\{\{location\}\}/g, location);
  };

  const applyTemplateSelection = (value: string, booking: Booking) => {
    setEmailTemplate(value);

    if (!booking) return;

    if (value === "custom") {
      // Keep whatever is currently in the editor
      return;
    }

    const custom = emailTemplates.find((t) => t.id === value);
    if (custom) {
      const filledSubject = fillTemplateVariables(custom.subject, booking);
      const filledBody = fillTemplateVariables(custom.body, booking);
      setEmailSubject(filledSubject);
      setEmailBody(filledBody);
      return;
    }

    // Built-in presets
    const presetKey = value === "reminder_24h" || value === "reminder_1h" || value === "follow_up" ? value : "reminder_24h";
    const built = buildTemplateFromPreset(presetKey, booking);
    setEmailSubject(built.subject);
    setEmailBody(built.body);
  };

  const openEmailDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    // Start empty; user can choose a template or type from scratch
    setEmailTemplate("custom");
    setEmailSubject("");
    setEmailBody("");
    setEmailDialogOpen(true);
  };

  const sendInviteeEmail = async () => {
    if (!selectedBooking) return;

    try {
      setSendingEmail(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invitee-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          subject: emailSubject.trim() || null,
          body: emailBody.trim() || null,
          template_key: emailTemplate,
          trigger_type: "manual",
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || detail?.error || "Failed to send email");
      }

      toast({ title: "Email sent", description: `Reminder sent to ${selectedBooking.invitee_email}` });
      setEmailDialogOpen(false);
      setSelectedBooking(null);
    } catch (error: any) {
      console.error("Error sending invitee email", error);
      toast({
        title: "Email failed",
        description: error?.message || "Could not send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };


  const loadBookings = useCallback(async () => {
    setLoading(true);
    const companyId = await getCompanyId({ allowFallback: false });
    if (!companyId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, event_types(*)")
      .eq("company_id", companyId)
      .order("start_time", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } else {
      setBookings((data || []) as any);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const handler = () => {
      loadBookings();
    };
    window.addEventListener('bookings-refresh', handler);
    return () => {
      window.removeEventListener('bookings-refresh', handler);
    };
  }, [loadBookings]);

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      // Use edge-proxy to call with service role key
      const res = await fetch('/api/edge-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: 'update-booking-status',
          payload: { booking_id: bookingId, status: newStatus },
          method: 'POST',
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Update status error:', errorData);
        throw new Error(errorData.error || 'Failed to update booking status');
      }

      const normalized = formatBookingStatus(normalizeBookingStatus(newStatus));
      setBookings(bookings.map(b => 
        b.id === bookingId ? { ...b, status: normalizeBookingStatus(newStatus) } : b
      ));
      toast({
        title: "Success",
        description: `Booking status updated to ${normalized}`,
      });
      signalCallTrackerRefresh();
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update booking status",
        variant: "destructive",
      });
    }
  };

  const openEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    setEditForm({
      invitee_name: booking.invitee_name,
      invitee_email: booking.invitee_email,
      invitee_phone: booking.invitee_phone ?? "",
      chosen_call_type: booking.chosen_call_type ?? "meeting",
      date: format(start, 'yyyy-MM-dd'),
      time: format(start, 'HH:mm'),
      duration_minutes: duration,
      status: booking.status,
      notes: ((booking as any).notes ?? "") as string,
      video_join_url: booking.video_join_url ?? "",
    });
    setEditDialogOpen(true);
  };

  const handleEditField = <K extends keyof typeof editForm>(key: K, value: (typeof editForm)[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitEditBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBooking) return;

    try {
      if (!editForm.date || !editForm.time) {
        toast({ title: "Error", description: "Please provide date and time", variant: "destructive" });
        return;
      }

      const start = new Date(`${editForm.date}T${editForm.time}`);
      if (Number.isNaN(start.getTime())) {
        toast({ title: "Error", description: "Invalid date or time", variant: "destructive" });
        return;
      }

      const end = new Date(start.getTime() + editForm.duration_minutes * 60000);
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      // Use edge-proxy to call with service role key
      const res = await fetch('/api/edge-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: 'update-booking',
          payload: {
            booking_id: selectedBooking.id,
            invitee_name: editForm.invitee_name,
            invitee_email: editForm.invitee_email,
            invitee_phone: editForm.invitee_phone || null,
            chosen_call_type: editForm.chosen_call_type,
            start_time: startIso,
            end_time: endIso,
            status: editForm.status,
            notes: editForm.notes,
            video_join_url: editForm.video_join_url || null,
            send_email: sendUpdateEmail,
          },
          method: 'POST',
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Update booking error:', errorData);
        throw new Error(errorData.error || "Failed to update booking");
      }

      const updatedBooking: Booking = {
        ...selectedBooking,
        invitee_name: editForm.invitee_name,
        invitee_email: editForm.invitee_email,
        invitee_phone: editForm.invitee_phone || undefined,
        chosen_call_type: editForm.chosen_call_type,
        start_time: startIso,
        end_time: endIso,
        status: editForm.status,
        video_join_url: editForm.video_join_url || null,
      } as Booking;

      setBookings(bookings.map((b) => (b.id === selectedBooking.id ? updatedBooking : b)));
      toast({ 
        title: "Booking updated",
        description: sendUpdateEmail ? "Invitee has been notified" : undefined
      });
      setEditDialogOpen(false);
      setSelectedBooking(null);
      setSendUpdateEmail(false);
      signalCallTrackerRefresh();
    } catch (error: any) {
      console.error('Error updating booking', error);
      toast({ title: "Error", description: error.message || 'Failed to update booking', variant: "destructive" });
    }
  };

  const markAsConverted = async () => {
    if (!selectedBooking) return;
    
    const amount = parseFloat(conversionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    try {
      // Use edge-proxy to call with service role key
      const res = await fetch('/api/edge-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: 'convert-booking',
          payload: { booking_id: selectedBooking.id, is_converted: true, conversion_amount: amount },
          method: 'POST',
        })
      });

      const responseText = await res.text();
      console.log('Convert booking response:', { status: res.status, text: responseText });

      if (!res.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || 'Failed to mark as converted' };
        }
        console.error('Convert booking error:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to mark as converted');
      }

      setBookings(bookings.map(b => 
        b.id === selectedBooking.id 
          ? { ...b, is_converted: true, conversion_amount: amount, converted_at: new Date().toISOString() } as any
          : b
      ));
      toast({
        title: "Success",
        description: "Booking marked as converted",
      });
      setConversionDialogOpen(false);
      setConversionAmount("");
      setSelectedBooking(null);

      signalCallTrackerRefresh();
    } catch (error: any) {
      console.error('Error converting booking:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark as converted",
        variant: "destructive",
      });
    }
  };

  const undoConversion = async (bookingId: string) => {
    try {
      // Use edge-proxy to call with service role key
      const res = await fetch('/api/edge-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: 'convert-booking',
          payload: { booking_id: bookingId, is_converted: false },
          method: 'POST',
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Undo conversion error:', errorData);
        throw new Error(errorData.error || 'Failed to undo conversion');
      }

      setBookings(bookings.map(b => 
        b.id === bookingId 
          ? { ...b, is_converted: false, conversion_amount: null, converted_at: null } as any
          : b
      ));
      toast({
        title: "Success",
        description: "Conversion removed",
      });

      signalCallTrackerRefresh();
    } catch (error: any) {
      console.error('Error undoing conversion:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to undo conversion",
        variant: "destructive",
      });
    }
  };

  const checkWhopPayment = async (booking: Booking) => {
    setCheckingPayment(booking.id);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-whop-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ booking_id: booking.id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check payment');
      }

      if (data.has_payment) {
        setBookings(bookings.map(b => 
          b.id === booking.id 
            ? { ...b, is_converted: true, converted_at: new Date().toISOString() } as any
            : b
        ));

        toast({
          title: "Payment Confirmed!",
          description: `Found ${data.active_memberships_count} active Whop membership(s) for ${data.email}`,
        });

        signalCallTrackerRefresh();
      } else {
        toast({
          title: "No Payment Found",
          description: data.message || "No active Whop membership found for this email",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check Whop payment",
        variant: "destructive",
      });
    } finally {
      setCheckingPayment(null);
    }
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;

    setDeleting(true);
    try {
      // Use edge-proxy to call with service role key
      const res = await fetch('/api/edge-proxy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: 'delete-booking',
          payload: { 
            booking_id: bookingToDelete.id,
            send_email: false 
          },
          method: 'POST',
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Delete booking error:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to delete booking');
      }

      const result = await res.json();
      console.log('Delete booking success:', result);

      // Ensure mirrored call logs are cleaned up so analytics stay in sync
      const deleteCallLogsPromise = supabase
        .from("call_logs")
        .delete()
        .eq("booking_id", bookingToDelete.id);

      setBookings(bookings.filter(b => b.id !== bookingToDelete.id));
      toast({
        title: "Removed from call tracker",
        description: "Calendar event removed and booking cleared from your dashboard.",
      });

      // Await call log cleanup so downstream dashboards re-compute correctly
      try {
        await deleteCallLogsPromise;
      } catch (callLogError) {
        console.error("Error deleting linked call logs:", callLogError);
      }
      signalCallTrackerRefresh();
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete booking",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedBooking) return;
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/save-booking-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
      body: JSON.stringify({ booking_id: selectedBooking.id, notes: editableNotes.trim() })
    });

    if (!res.ok) {
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    } else {
      setBookings(bookings.map(b => 
        b.id === selectedBooking.id 
          ? { ...b, notes: editableNotes.trim() } as any
          : b
      ));
      toast({
        title: "Success",
        description: "Notes saved",
      });
      setNotesEditDialogOpen(false);
      setEditableNotes("");
      setSelectedBooking(null);
      signalCallTrackerRefresh();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'canceled': return <X className="w-4 h-4" />;
      case 'no_show': return <UserX className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'scheduled': return 'secondary';
      case 'canceled': return 'destructive';
      case 'no_show': return 'outline';
      default: return 'secondary';
    }
  };

  const getCallTypeIcon = (callType: string | null) => {
    if (!callType) return null;
    
    switch (callType) {
      case 'zoom':
      case 'google_meet':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'in_person':
        return <MapPin className="w-4 h-4" />;
      case 'custom':
        return <LinkIcon className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const formatInviteeResponses = (booking: Booking) => {
    if (!booking.answers || typeof booking.answers !== 'object') {
      return "";
    }

    const answersArray = Object.entries(booking.answers);
    if (answersArray.length === 0) {
      return "";
    }

    let text = "=== INVITEE RESPONSES ===\n";
    answersArray.forEach(([questionId, answer]) => {
      const schema = (booking as any).event_types?.invitee_form_schema;
      let label = questionId;
      
      if (schema && Array.isArray(schema)) {
        const question = schema.find((q: any) => q.id === questionId) as any;
        label = question?.label || questionId;
      }
      
      text += `\n${label}: ${Array.isArray(answer) ? answer.join(', ') : answer}`;
    });

    text += "\n\n=== YOUR NOTES ===\n";

    return text;
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = 
      booking.invitee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.invitee_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.invitee_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === "all" || normalizeBookingStatus(booking.status) === normalizeBookingStatus(statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  const bookingNeedsFollowup = bookings.filter((booking) => {
    const callType = booking.chosen_call_type;
    const isVirtual = callType === 'zoom' || callType === 'google_meet' || callType === 'custom';
    const isScheduled = normalizeBookingStatus(booking.status) === normalizeBookingStatus('scheduled');
    const noRealLink = !booking.video_join_url || booking.video_join_url === meetingLinkPlaceholder;
    return isVirtual && isScheduled && noRealLink;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Calls</CardTitle>
            <p className="text-sm text-muted-foreground">Manage your scheduled calls and bookings</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadBookings}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {extraActions}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {bookingNeedsFollowup.length > 0 && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-500/15 dark:text-amber-100">
              <AlertTitle>Meeting links pending</AlertTitle>
              <AlertDescription>
                {bookingNeedsFollowup.length} booking{bookingNeedsFollowup.length === 1 ? "" : "s"} still need a meeting link. Contact the host or share call details manually.
              </AlertDescription>
            </Alert>
          )}
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {bookings.length === 0 ? "No bookings yet" : "No matching bookings"}
              </h3>
              <p className="text-muted-foreground">
                {bookings.length === 0 
                  ? "Your bookings will appear here once people start scheduling"
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Call Type</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.invitee_name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <button
                            onClick={() => openEmailDialog(booking)}
                            className="text-primary hover:underline truncate max-w-[200px] block text-left"
                          >
                            {booking.invitee_email}
                          </button>
                          {booking.invitee_phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{booking.invitee_phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(booking.start_time), 'MMM dd, yyyy')}</div>
                          <div className="text-muted-foreground">
                            {formatTimeInTimezone(booking.start_time, timezone)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {booking.chosen_call_type ? (
                          booking.video_join_url && booking.video_join_url !== meetingLinkPlaceholder ? (
                            <a
                              href={booking.video_join_url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Badge variant="outline" className="capitalize cursor-pointer hover:bg-accent">
                                {booking.chosen_call_type.replace('_', ' ')}
                              </Badge>
                            </a>
                          ) : (
                            <Badge variant="outline" className="capitalize">
                              {booking.chosen_call_type.replace('_', ' ')}
                            </Badge>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {(booking as any).event_types?.name || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={booking.status} 
                          onValueChange={(value) => updateBookingStatus(booking.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(booking.status)}
                              <span className={cn("capitalize", statusTextColorClass(booking.status))}>
                                {formatBookingStatus(normalizeBookingStatus(booking.status))}
                              </span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="canceled">Cancelled</SelectItem>
                            <SelectItem value="no_show">No Show</SelectItem>
                            <SelectItem value="hasnt_paid_yet">Hasn't Paid Yet</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {(booking as any).is_converted ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="gap-1">
                              {(booking as any).conversion_amount ? `£${((booking as any).conversion_amount).toFixed(2)}` : 'Paid'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => undoConversion(booking.id)}
                              className="h-7 px-2"
                            >
                              <Undo2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setConversionDialogOpen(true);
                            }}
                            disabled={booking.status !== 'completed'}
                            title={booking.status !== 'completed' ? 'Only completed bookings can be marked as converted' : ''}
                          >
                            <PoundSterling className="w-4 h-4 mr-1" />
                            Mark Converted
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(booking.id);
                              toast({
                                title: "Booking ID Copied",
                                description: "Paste this into your Whop invoice description to link the payment.",
                              });
                            }}
                            title="Copy booking ID for invoice"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditBooking(booking)}
                            title="Edit booking"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBookingToDelete(booking);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive hover:text-destructive"
                            title="Delete booking"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Booking Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedBooking(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{(selectedBooking as any)?.event_types?.name || 'Sales CRM'}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{editForm.invitee_name}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {formatBookingStatus(normalizeBookingStatus(editForm.status))}
            </Badge>
          </DialogHeader>
          <form onSubmit={submitEditBooking} className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
            {/* Left Column - Booking Details */}
            <div className="space-y-4">
              {/* Call Type Badge */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Video className="w-4 h-4" />
                <span className="text-sm capitalize">{editForm.chosen_call_type.replace('_', ' ')}</span>
              </div>

              {/* Date & Time Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => handleEditField('date', e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Time
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={editForm.time}
                      onChange={(e) => handleEditField('time', e.target.value)}
                      required
                      className="bg-background"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">({editForm.duration_minutes} min)</span>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Contact
                </Label>
                <Input
                  value={editForm.invitee_email}
                  onChange={(e) => handleEditField('invitee_email', e.target.value)}
                  required
                  className="bg-background"
                />
              </div>

              {/* Meeting Link Section */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  Meeting Link
                </Label>
                <div className="space-y-2">
                  <Input
                    value={editForm.video_join_url}
                    onChange={(e) => handleEditField('video_join_url', e.target.value)}
                    placeholder="Meeting link will be sent by host"
                    className="bg-background"
                  />
                  {editForm.video_join_url && editForm.video_join_url !== meetingLinkPlaceholder && (
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => window.open(editForm.video_join_url, '_blank')}
                      className="w-full"
                    >
                      Join Meeting
                    </Button>
                  )}
                </div>
              </div>

              {/* Converted Status */}
              {(selectedBooking as any)?.is_converted && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                    <PoundSterling className="w-3 h-3" />
                    Converted
                  </Label>
                  <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                    <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                      {(selectedBooking as any).conversion_amount ? `£${((selectedBooking as any).conversion_amount).toFixed(2)}` : 'Paid'}
                    </span>
                  </div>
                </div>
              )}

              {/* Invitee Responses */}
              {selectedBooking?.answers && Object.keys(selectedBooking.answers).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Invitee Responses
                  </Label>
                  <div className="p-3 bg-muted rounded-md space-y-2">
                    {Object.entries(selectedBooking.answers).map(([questionId, answer]) => {
                      const schema = (selectedBooking as any).event_types?.invitee_form_schema;
                      let label = questionId;
                      
                      if (schema && Array.isArray(schema)) {
                        const question = schema.find((q: any) => q.id === questionId);
                        label = question?.label || questionId;
                      }
                      
                      return (
                        <div key={questionId} className="text-sm">
                          <div className="text-xs text-muted-foreground">{label}</div>
                          <div>{Array.isArray(answer) ? answer.join(', ') : String(answer)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Notes Section */}
            <div className="space-y-2 lg:border-l lg:pl-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Notes
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotesEditMode(!notesEditMode)}
                  className="h-7 text-xs"
                >
                  {notesEditMode ? 'Done' : 'Edit'}
                </Button>
              </div>
              {notesEditMode ? (
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => handleEditField('notes', e.target.value)}
                  rows={12}
                  placeholder="No notes added. Click Edit to add notes."
                  className="bg-background resize-none"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md min-h-[300px]">
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {editForm.notes || 'No notes added. Click Edit to add notes.'}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Fields (Collapsed) - Spans both columns */}
            <div className="lg:col-span-2">
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium">Advanced Options</summary>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label htmlFor="booking-invitee-name">Client Name</Label>
                    <Input
                      id="booking-invitee-name"
                      value={editForm.invitee_name}
                      onChange={(e) => handleEditField('invitee_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="booking-invitee-phone">Phone</Label>
                    <Input
                      id="booking-invitee-phone"
                      value={editForm.invitee_phone}
                      onChange={(e) => handleEditField('invitee_phone', e.target.value)}
                      placeholder="+44 123 456 7890"
                    />
                  </div>
                  <div>
                    <Label htmlFor="booking-call-type">Call Type</Label>
                    <Select
                      value={editForm.chosen_call_type}
                      onValueChange={(value: string) => handleEditField('chosen_call_type', value)}
                    >
                      <SelectTrigger id="booking-call-type">
                        <SelectValue placeholder="Select call type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                        <SelectItem value="in_person">In Person</SelectItem>
                        <SelectItem value="custom">Custom Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="booking-duration">Duration (minutes)</Label>
                    <Input
                      id="booking-duration"
                      type="number"
                      min="1"
                      value={editForm.duration_minutes}
                      onChange={(e) => handleEditField('duration_minutes', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="booking-status">Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value: Booking["status"]) => handleEditField('status', value)}
                    >
                      <SelectTrigger id="booking-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="canceled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                        <SelectItem value="hasnt_paid_yet">Hasn't Paid Yet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </details>
            </div>

            {/* Footer - Spans both columns */}
            <div className="lg:col-span-2 space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-update-email"
                  checked={sendUpdateEmail}
                  onCheckedChange={(checked) => setSendUpdateEmail(checked as boolean)}
                />
                <Label
                  htmlFor="send-update-email"
                  className="text-sm font-normal cursor-pointer"
                >
                  Send update notification to invitee
                </Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedBooking(null); setSendUpdateEmail(false); setNotesEditMode(false); }}>
                  Cancel
                </Button>
                <Button type="submit">Update Booking</Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Conversion Dialog */}
      <Dialog open={conversionDialogOpen} onOpenChange={(open) => {
        setConversionDialogOpen(open);
        if (!open) {
          setSelectedBooking(null);
          setConversionAmount("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Converted</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Mark this booking as converted and add the conversion amount.
              </p>
              {selectedBooking && (
                <div className="p-3 bg-muted rounded-md mb-4">
                  <p className="font-medium">{selectedBooking.invitee_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.invitee_email}</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Conversion Amount (£)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={conversionAmount}
                onChange={(e) => setConversionAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConversionDialogOpen(false);
                setSelectedBooking(null);
                setConversionAmount("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={markAsConverted}>
              <PoundSterling className="w-4 h-4 mr-2" />
              Mark as Converted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Edit Dialog */}
      <Dialog open={notesEditDialogOpen} onOpenChange={(open) => {
        setNotesEditDialogOpen(open);
        if (!open) {
          setSelectedBooking(null);
          setEditableNotes("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBooking && (
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{selectedBooking.invitee_name}</p>
                <p className="text-sm text-muted-foreground">{selectedBooking.invitee_email}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="Add your notes below the invitee responses..."
                value={editableNotes}
                onChange={(e) => setEditableNotes(e.target.value)}
                className="min-h-[250px] font-mono text-sm"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editableNotes.length}/2000 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNotesEditDialogOpen(false);
                setSelectedBooking(null);
                setEditableNotes("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Invitee Dialog - localhost only */}
      {isLocalhost && (
        <Dialog
          open={emailDialogOpen}
          onOpenChange={(open) => {
            setEmailDialogOpen(open);
            if (!open) {
              setSelectedBooking(null);
              setEmailBody("");
              setEmailSubject("");
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Email invitee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedBooking && (
                <div className="p-3 bg-muted rounded-md text-sm">
                  <div className="font-medium">{selectedBooking.invitee_name}</div>
                  <div className="text-muted-foreground">{selectedBooking.invitee_email}</div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="email-template">Template</Label>
                <Select
                  value={emailTemplate}
                  onValueChange={(value) => {
                    if (selectedBooking) {
                      applyTemplateSelection(value, selectedBooking);
                    } else {
                      setEmailTemplate(value);
                    }
                  }}
                >
                  <SelectTrigger id="email-template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom / Blank</SelectItem>
                    <SelectItem value="reminder_24h">24h Reminder (built-in)</SelectItem>
                    <SelectItem value="reminder_1h">1h Reminder (built-in)</SelectItem>
                    <SelectItem value="follow_up">Follow-up (built-in)</SelectItem>
                    {emailTemplates.length > 0 && (
                      <SelectItem value="__divider" disabled>
                        ─────────────
                      </SelectItem>
                    )}
                    {emailTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email-body">Message</Label>
                <Textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  placeholder="Write your message..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailDialogOpen(false);
                  setSelectedBooking(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={sendInviteeEmail} disabled={sendingEmail || !emailSubject.trim()}>
                {sendingEmail ? "Sending..." : "Send email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Call Tracker?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove this booking from your call tracker? This action will:
            </p>
            <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
              <li>Remove the booking from your calendar</li>
              <li>Delete the Google Calendar event</li>
              <li>Remove all associated data including conversions and revenue</li>
            </ul>
            {bookingToDelete && (
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{bookingToDelete.invitee_name}</p>
                <p className="text-sm text-muted-foreground">{bookingToDelete.invitee_email}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(bookingToDelete.start_time).toLocaleString()}
                </p>
              </div>
            )}
            <p className="text-sm font-medium text-destructive">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setBookingToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteBooking}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Booking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
