"use client";

import { EventType } from "@/types/scheduling";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

interface HostsSectionProps {
  data: Partial<EventType>;
  onChange: (updates: Partial<EventType>) => void;
}

export const HostsSection = ({ data, onChange }: HostsSectionProps) => {
  return (
    <div className="space-y-6">
      <div>
        <Label>Primary Host</Label>
        <Card className="p-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">You</p>
              <p className="text-sm text-muted-foreground">Primary host</p>
            </div>
            <Badge className="ml-auto">Default</Badge>
          </div>
        </Card>
      </div>

      <div>
        <Label>Co-hosts (Coming Soon)</Label>
        <Card className="p-8 mt-2 text-center">
          <p className="text-sm text-muted-foreground">
            Add co-hosts and enable round-robin scheduling in a future update
          </p>
          <Badge variant="secondary" className="mt-2">Feature in Development</Badge>
        </Card>
      </div>
    </div>
  );
};
