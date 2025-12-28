"use client";

import { EventType } from "@/types/scheduling";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface NotificationsSectionProps {
  data: Partial<EventType>;
  onChange: (updates: Partial<EventType>) => void;
}

export const NotificationsSection = ({ data, onChange }: NotificationsSectionProps) => {
  const notifications = data.notifications || {
    email: { enabled: true, confirmation: true, reminders: [1440, 60], followup: 0 },
    sms: { enabled: false, confirmation: false, reminders: [], followup: 0 }
  };

  const templates = data.templates || {
    email: {
      confirmation: { subject: "Booking Confirmed: {event_name}", body: "" },
      reminder: { subject: "Reminder: {event_name} in {offset}", body: "" },
      followup: { subject: "Thank you for meeting!", body: "" }
    },
    sms: {
      confirmation: "Your booking for {event_name} on {event_date} at {event_time} is confirmed.",
      reminder: "Reminder: {event_name} in {offset}. Join: {join_url}",
      followup: "Thank you for meeting with us!"
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Configure email and SMS notifications for your bookings
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6 mt-6">
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
              <div className="flex items-center justify-between">
                <Label>Confirmation Email</Label>
                <Switch
                  checked={notifications.email.confirmation}
                  onCheckedChange={(checked) => onChange({
                    notifications: {
                      ...notifications,
                      email: { ...notifications.email, confirmation: checked }
                    }
                  })}
                />
              </div>

              <Card className="p-4 space-y-3">
                <div>
                  <Label className="text-xs">Subject</Label>
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
                  />
                </div>
                <div>
                  <Label className="text-xs">Body</Label>
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
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available tags: {"{invitee_name}"}, {"{event_name}"}, {"{event_date}"}, {"{event_time}"}, {"{join_url}"}
                  </p>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="sms" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable SMS Notifications</Label>
              <p className="text-xs text-muted-foreground">Send text messages to invitees</p>
            </div>
            <Switch
              checked={notifications.sms.enabled}
              onCheckedChange={(checked) => onChange({
                notifications: {
                  ...notifications,
                  sms: { ...notifications.sms, enabled: checked }
                }
              })}
            />
          </div>

          {notifications.sms.enabled && (
            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                SMS notifications require phone number collection. Make sure to add a phone question in the Invitee Questions section.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
