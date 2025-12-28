"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Mail, Phone, Video, MapPin, Link as LinkIcon, FileText, Search, Check, X, UserX, RefreshCw, PoundSterling, Undo2, Trash2, Edit, Send } from "lucide-react";
import { Booking } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
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
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-booking-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: bookingId, status: newStatus })
    });

    if (!res.ok) {
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    } else {
      const normalized = formatBookingStatus(normalizeBookingStatus(newStatus));
      setBookings(bookings.map(b => 
        b.id === bookingId ? { ...b, status: normalizeBookingStatus(newStatus) } : b
      ));
      toast({
        title: "Success",
        description: `Booking status updated to ${normalized}`,
      });
      signalCallTrackerRefresh();
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

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error || "Failed to update booking");
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
      toast({ title: "Booking updated" });
      setEditDialogOpen(false);
      setSelectedBooking(null);
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
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/convert-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: selectedBooking.id, is_converted: true, conversion_amount: amount })
    });

    if (!res.ok) {
      toast({
        title: "Error",
        description: "Failed to mark as converted",
        variant: "destructive",
      });
    } else {
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
    }
  };

  const undoConversion = async (bookingId: string) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/convert-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: bookingId, is_converted: false })
    });

    if (!res.ok) {
      toast({
        title: "Error",
        description: "Failed to undo conversion",
        variant: "destructive",
      });
    } else {
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
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this booking? This will remove all associated data including conversions and revenue from analytics.")) {
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: bookingId })
    });

    if (!res.ok) {
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    } else {
      setBookings(bookings.filter(b => b.id !== bookingId));
      toast({
        title: "Success",
        description: "Booking deleted and analytics updated",
      });
      signalCallTrackerRefresh();
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
                    <TableHead>Notes</TableHead>
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
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{booking.invitee_email}</span>
                          </div>
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
                            {format(new Date(booking.start_time), 'HH:mm')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking.chosen_call_type ? (
                          <div className="flex items-center gap-2">
                            {getCallTypeIcon(booking.chosen_call_type)}
                            <span className="text-sm capitalize">
                              {booking.chosen_call_type.replace('_', ' ')}
                            </span>
                          </div>
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
                              £{((booking as any).conversion_amount || 0).toFixed(2)}
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
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking);
                            const responses = formatInviteeResponses(booking);
                            const existingNotes = (booking as any).notes || "";
                            
                            // If notes don't already contain responses, prepend them
                            if (responses && !existingNotes.includes("=== INVITEE RESPONSES ===")) {
                              setEditableNotes(responses + existingNotes);
                            } else {
                              setEditableNotes(existingNotes);
                            }
                            setNotesEditDialogOpen(true);
                          }}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          {(booking as any).notes ? "View Notes" : "Add Notes"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLocalhost && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEmailDialog(booking)}
                              title="Email invitee"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditBooking(booking)}
                            title="Edit booking"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {booking.video_join_url && booking.video_join_url !== meetingLinkPlaceholder && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(booking.video_join_url as string, '_blank')}
                              title="Join meeting"
                            >
                              <Video className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBooking(booking.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEditBooking} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="booking-invitee-name">Client Name *</Label>
                <Input
                  id="booking-invitee-name"
                  value={editForm.invitee_name}
                  onChange={(e) => handleEditField('invitee_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="booking-invitee-email">Email *</Label>
                <Input
                  id="booking-invitee-email"
                  type="email"
                  value={editForm.invitee_email}
                  onChange={(e) => handleEditField('invitee_email', e.target.value)}
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
                <Label htmlFor="booking-date">Date *</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => handleEditField('date', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="booking-time">Time *</Label>
                <Input
                  id="booking-time"
                  type="time"
                  value={editForm.time}
                  onChange={(e) => handleEditField('time', e.target.value)}
                  required
                />
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

            <div>
              <Label htmlFor="booking-meeting-link">Meeting Link</Label>
              <Input
                id="booking-meeting-link"
                value={editForm.video_join_url}
                onChange={(e) => handleEditField('video_join_url', e.target.value)}
                placeholder="Paste meeting URL or leave blank to send manually"
              />
              {editForm.chosen_call_type === 'google_meet' || editForm.chosen_call_type === 'zoom' ? (
                <p className="text-xs text-muted-foreground mt-1">
                  If an integration is connected, the link will be generated automatically; otherwise paste it here.
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="booking-notes">Notes</Label>
              <Textarea
                id="booking-notes"
                value={editForm.notes}
                onChange={(e) => handleEditField('notes', e.target.value)}
                rows={4}
                placeholder="Agenda, preparation, follow-up tasks..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedBooking(null); }}>
                Cancel
              </Button>
              <Button type="submit">Update Booking</Button>
            </DialogFooter>
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
    </div>
  );
};
