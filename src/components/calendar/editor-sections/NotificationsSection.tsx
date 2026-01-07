"use client";

import React from "react";
import { EventType } from "@/types/scheduling";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, Mail, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface NotificationsSectionProps {
  data: Partial<EventType>;
  onChange: (updates: Partial<EventType>) => void;
}

export const NotificationsSection = ({ data, onChange }: NotificationsSectionProps) => {
  const [confirmationOpen, setConfirmationOpen] = React.useState(true);
  const [remindersOpen, setRemindersOpen] = React.useState(true);
  const [followupOpen, setFollowupOpen] = React.useState(false);

  const notifications = data.notifications || {
    email: { enabled: true, confirmation: true, reminders: [1440, 60], followup: 0, confirmationDelay: 0 },
    sms: { enabled: false, confirmation: false, reminders: [], followup: 0 }
  };

  const templates = data.templates || {
    email: {
      confirmation: {
        subject: "Booking Confirmed: {event_name}",
        body: "Hi {invitee_name},\n\nYour booking for {event_name} is confirmed!\n\nDate: {event_date}\nTime: {event_time}\nJoin: {join_url}\n\nLooking forward to meeting you!"
      },
      reminder: {
        subject: "Reminder: {event_name} in {offset}",
        body: "Hi {invitee_name},\n\nThis is a reminder that your meeting {event_name} is coming up.\n\nDate: {event_date}\nTime: {event_time}\nJoin: {join_url}\n\nSee you soon!"
      },
      followup: {
        subject: "Thank you for meeting!",
        body: "Hi {invitee_name},\n\nThank you for taking the time to meet with us. We appreciate it!\n\nBest regards"
      }
    },
    sms: {
      confirmation: "Your booking for {event_name} on {event_date} at {event_time} is confirmed.",
      reminder: "Reminder: {event_name} in {offset}. Join: {join_url}",
      followup: "Thank you for meeting with us!"
    }
  };

  const delayOptions = [
    { value: 0, label: "Immediately" },
    { value: 2, label: "2 minutes after booking" },
    { value: 5, label: "5 minutes after booking" },
    { value: 10, label: "10 minutes after booking" },
    { value: 30, label: "30 minutes after booking" },
    { value: 60, label: "1 hour after booking" }
  ];

  const reminderOptions = [
    { value: 5, label: "5 minutes before" },
    { value: 10, label: "10 minutes before" },
    { value: 15, label: "15 minutes before" },
    { value: 30, label: "30 minutes before" },
    { value: 60, label: "1 hour before" },
    { value: 120, label: "2 hours before" },
    { value: 1440, label: "1 day before" },
    { value: 2880, label: "2 days before" }
  ];

  const followupOptions = [
    { value: 0, label: "Don't send" },
    { value: 5, label: "5 minutes after" },
    { value: 30, label: "30 minutes after" },
    { value: 60, label: "1 hour after" },
    { value: 120, label: "2 hours after" },
    { value: 1440, label: "1 day after" }
  ];

  const addReminder = () => {
    const currentReminders = notifications.email.reminders || [];
    onChange({
      notifications: {
        ...notifications,
        email: { ...notifications.email, reminders: [...currentReminders, 60] }
      }
    });
  };

  const removeReminder = (index: number) => {
    const currentReminders = notifications.email.reminders || [];
    onChange({
      notifications: {
        ...notifications,
        email: { ...notifications.email, reminders: currentReminders.filter((_, i) => i !== index) }
      }
    });
  };

  const updateReminder = (index: number, value: number) => {
    const currentReminders = notifications.email.reminders || [];
    const newReminders = [...currentReminders];
    newReminders[index] = value;
    onChange({
      notifications: {
        ...notifications,
        email: { ...notifications.email, reminders: newReminders }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Configure email notifications for your bookings
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Email Notifications</Label>
            <p className="text-xs text-muted-foreground">Send emails to invitees</p>
          </div>
          <Switch
            checked={notifications.email.enabled}
            onCheckedChange={(checked) => onChange({
              notifications: {
                ...notifications,
                email: { ...notifications.email, enabled: checked }
              }
            })}
          />
        </div>

        {notifications.email.enabled && (
          <>
            <Collapsible open={confirmationOpen} onOpenChange={setConfirmationOpen}>
              <Card className="border-l-4 border-l-emerald-500">
                <CollapsibleTrigger className="w-full">
                  <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Mail className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Confirmation Email</h3>
                          <Badge variant={notifications.email.confirmation ? "default" : "secondary"} className="text-xs">
                            {notifications.email.confirmation ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sent {delayOptions.find((d) => d.value === (notifications.email.confirmationDelay || 0))?.label.toLowerCase() ||
                            "immediately"} after booking
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={notifications.email.confirmation}
                        onCheckedChange={(checked) => {
                          onChange({
                            notifications: {
                              ...notifications,
                              email: { ...notifications.email, confirmation: checked }
                            }
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {confirmationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                {notifications.email.confirmation && (
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t">
                      <div className="pt-4">
                        <Label className="text-sm flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Send Delay
                        </Label>
                        <Select
                          value={String(notifications.email.confirmationDelay || 0)}
                          onValueChange={(value) => onChange({
                            notifications: {
                              ...notifications,
                              email: { ...notifications.email, confirmationDelay: parseInt(value) }
                            }
                          })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {delayOptions.map((option) => (
                              <SelectItem key={option.value} value={String(option.value)}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Email Subject</Label>
                        <Input
                          value={templates.email.confirmation.subject}
                          onChange={(e) => onChange({
                            templates: {
                              ...templates,
                              email: {
                                ...templates.email,
                                confirmation: { ...templates.email.confirmation, subject: e.target.value }
                              }
                            }
                          })}
                          placeholder="Booking Confirmed: {event_name}"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Email Body</Label>
                        <Textarea
                          value={templates.email.confirmation.body}
                          onChange={(e) => onChange({
                            templates: {
                              ...templates,
                              email: {
                                ...templates.email,
                                confirmation: { ...templates.email.confirmation, body: e.target.value }
                              }
                            }
                          })}
                          placeholder="Hi {invitee_name}, your booking is confirmed..."
                          rows={8}
                          className="font-mono text-xs mt-1.5"
                        />
                        <div className="mt-2 p-2 bg-muted/50 rounded-md">
                          <p className="text-xs text-muted-foreground mb-1 font-medium">Available variables:</p>
                          <div className="flex flex-wrap gap-1">
                            {['{invitee_name}', '{event_name}', '{event_date}', '{event_time}', '{join_url}'].map((tag) => (
                              <code key={tag} className="text-xs bg-background px-1.5 py-0.5 rounded border">
                                {tag}
                              </code>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                )}
              </Card>
            </Collapsible>

            <Collapsible open={remindersOpen} onOpenChange={setRemindersOpen}>
              <Card className="border-l-4 border-l-blue-500">
                <CollapsibleTrigger className="w-full">
                  <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Reminder Emails</h3>
                          <Badge variant="secondary" className="text-xs">
                            {(notifications.email.reminders || []).length}{' '}
                            {(notifications.email.reminders || []).length === 1 ? "reminder" : "reminders"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Sent before the meeting starts</p>
                      </div>
                    </div>
                    {remindersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4 border-t">
                    <div className="pt-4 space-y-3">
                      {(notifications.email.reminders || []).map((reminder, index) => (
                        <div key={index} className="p-3 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground mb-1.5 block">
                                Reminder #{index + 1}
                              </Label>
                              <Select
                                value={String(reminder)}
                                onValueChange={(value) => updateReminder(index, parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {reminderOptions.map((option) => (
                                    <SelectItem key={option.value} value={String(option.value)}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeReminder(index)}
                              className="mt-5 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addReminder}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Reminder
                      </Button>
                    </div>
                    <div className="pt-2 border-t space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Reminder Email Template</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          This template applies to all reminders
                        </p>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm">Subject</Label>
                            <Input
                              value={templates.email.reminder.subject}
                              onChange={(e) => onChange({
                                templates: {
                                  ...templates,
                                  email: {
                                    ...templates.email,
                                    reminder: { ...templates.email.reminder, subject: e.target.value }
                                  }
                                }
                              })}
                              placeholder="Reminder: {event_name} in {offset}"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Body</Label>
                            <Textarea
                              value={templates.email.reminder.body}
                              onChange={(e) => onChange({
                                templates: {
                                  ...templates,
                                  email: {
                                    ...templates.email,
                                    reminder: { ...templates.email.reminder, body: e.target.value }
                                  }
                                }
                              })}
                              placeholder="Hi {invitee_name}, this is a reminder..."
                              rows={8}
                              className="font-mono text-xs mt-1.5"
                            />
                            <div className="mt-2 p-2 bg-muted/50 rounded-md">
                              <p className="text-xs text-muted-foreground mb-1 font-medium">Available variables:</p>
                              <div className="flex flex-wrap gap-1">
                                {['{invitee_name}', '{event_name}', '{event_date}', '{event_time}', '{join_url}', '{offset}'].map(
                                  (tag) => (
                                    <code key={tag} className="text-xs bg-background px-1.5 py-0.5 rounded border">
                                      {tag}
                                    </code>
                                  )
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1.5">
                                <code className="bg-background px-1 py-0.5 rounded border">{"{offset}"}</code> shows time until meeting (e.g.,
                                "1 hour", "1 day")
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <Collapsible open={followupOpen} onOpenChange={setFollowupOpen}>
              <Card className="border-l-4 border-l-purple-500">
                <CollapsibleTrigger className="w-full">
                  <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Send className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Follow-up Email</h3>
                          <Badge variant={notifications.email.followup > 0 ? "default" : "secondary"} className="text-xs">
                            {notifications.email.followup > 0 ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {notifications.email.followup > 0
                            ? `Sent ${followupOptions.find((f) => f.value === notifications.email.followup)?.label.toLowerCase() ||
                                "after meeting"}`
                            : "Send a thank you email after the meeting"}
                        </p>
                      </div>
                    </div>
                    {followupOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4 border-t">
                    <div className="pt-4">
                      <Label className="text-sm flex items center gap-2">
                        <Clock className="w-3 h-3" />
                        Send Timing
                      </Label>
                      <Select
                        value={String(notifications.email.followup || 0)}
                        onValueChange={(value) => onChange({
                          notifications: {
                            ...notifications,
                            email: { ...notifications.email, followup: parseInt(value) }
                          }
                        })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {followupOptions.map((option) => (
                            <SelectItem key={option.value} value={String(option.value)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {notifications.email.followup > 0 && (
                      <>
                        <div>
                          <Label className="text-sm">Email Subject</Label>
                          <Input
                            value={templates.email.followup.subject}
                            onChange={(e) => onChange({
                              templates: {
                                ...templates,
                                email: {
                                  ...templates.email,
                                  followup: { ...templates.email.followup, subject: e.target.value }
                                }
                              }
                            })}
                            placeholder="Thank you for meeting!"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Email Body</Label>
                          <Textarea
                            value={templates.email.followup.body}
                            onChange={(e) => onChange({
                              templates: {
                                ...templates,
                                email: {
                                  ...templates.email,
                                  followup: { ...templates.email.followup, body: e.target.value }
                                }
                              }
                            })}
                            placeholder="Hi {invitee_name}, thank you for meeting..."
                            rows={8}
                            className="font-mono text-xs mt-1.5"
                          />
                          <div className="mt-2 p-2 bg-muted/50 rounded-md">
                            <p className="text-xs text-muted-foreground mb-1 font-medium">Available variables:</p>
                            <div className="flex flex-wrap gap-1">
                              {['{invitee_name}', '{event_name}', '{event_date}', '{event_time}'].map((tag) => (
                                <code key={tag} className="text-xs bg-background px-1.5 py-0.5 rounded border">
                                  {tag}
                                </code>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </>
        )}
      </div>
    </div>
  );
};