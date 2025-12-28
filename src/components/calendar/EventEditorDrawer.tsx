"use client";

import { useState } from "react";
import { EventType } from "@/types/scheduling";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { BasicsSection } from "./editor-sections/BasicsSection";
import { HostsSection } from "./editor-sections/HostsSection";
import { CallTypesSection } from "./editor-sections/CallTypesSection";
import { EventTimesSection } from "./editor-sections/EventTimesSection";
import { InviteeQuestionsSection } from "./editor-sections/InviteeQuestionsSection";
import { NotificationsSection } from "./editor-sections/NotificationsSection";
import { ConfirmationPageSection } from "./editor-sections/ConfirmationPageSection";
import { AppearanceSection } from "./editor-sections/AppearanceSection";
import { PreviewSection } from "./editor-sections/PreviewSection";

type Section = 
  | "basics"
  | "hosts"
  | "call-types"
  | "event-times"
  | "invitee-questions"
  | "notifications"
  | "confirmation"
  | "appearance"
  | "preview";

interface EventEditorDrawerProps {
  eventType: EventType | null;
  onClose: () => void;
}

export const EventEditorDrawer = ({ eventType, onClose }: EventEditorDrawerProps) => {
  const [activeSection, setActiveSection] = useState<Section>("basics");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<EventType>>(
    eventType || {
      name: "",
      slug: "",
      description: "",
      duration_minutes: 30,
      location_type: "zoom",
      is_active: true,
      allowed_call_types: ["zoom"],
      default_call_type: "zoom",
      invitee_form_schema: [],
      buffer_before: 0,
      buffer_after: 0,
      min_notice_hours: 24,
      time_increment: 15,
      notifications: {
        email: { enabled: true, confirmation: true, reminders: [1440, 60], followup: 0 },
        sms: { enabled: false, confirmation: false, reminders: [], followup: 0 }
      },
      templates: {
        email: {
          confirmation: { subject: "", body: "" },
          reminder: { subject: "", body: "" },
          followup: { subject: "", body: "" }
        },
        sms: {
          confirmation: "",
          reminder: "",
          followup: ""
        }
      }
    }
  );

  const sections = [
    { id: "basics", label: "Basics" },
    { id: "hosts", label: "Hosts" },
    { id: "call-types", label: "Call Types" },
    { id: "event-times", label: "Event Times & Limits" },
    { id: "invitee-questions", label: "Invitee Questions" },
    { id: "notifications", label: "Notifications" },
    { id: "confirmation", label: "Confirmation Page" },
    { id: "appearance", label: "Appearance" },
    { id: "preview", label: "Preview" },
  ] as const;

  const handleDataChange = (updates: Partial<EventType>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const renderSection = () => {
    const props = { data: formData, onChange: handleDataChange };
    
    switch (activeSection) {
      case "basics":
        return <BasicsSection {...props} />;
      case "hosts":
        return <HostsSection {...props} />;
      case "call-types":
        return <CallTypesSection {...props} />;
      case "event-times":
        return <EventTimesSection {...props} />;
      case "invitee-questions":
        return <InviteeQuestionsSection {...props} />;
      case "notifications":
        return <NotificationsSection {...props} />;
      case "confirmation":
        return <ConfirmationPageSection {...props} />;
      case "appearance":
        return <AppearanceSection {...props} />;
      case "preview":
        return <PreviewSection data={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex">
      {/* Left Mini Nav */}
      <div className="w-52 border-r bg-muted/30 p-4 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Sections</h3>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as Section)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {section.label}
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {eventType ? "Edit Event Type" : "Create Event Type"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {sections.find(s => s.id === activeSection)?.label}
            </p>
          </div>
          {hasUnsavedChanges && (
            <Badge variant="secondary">Unsaved changes</Badge>
          )}
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            {renderSection()}
          </div>
        </ScrollArea>

        {/* Sticky Footer */}
        <div className="border-t p-4 bg-background">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <Button variant="ghost" onClick={onClose}>
              Discard
            </Button>
            <Button>
              <Save className="w-4 h-4 mr-2" />
              Save Event Type
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
