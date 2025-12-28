"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap } from "lucide-react";

export const AutomationsTab = () => {
  // Stub component - will be implemented later
  const automations: any[] = [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Automations</h2>
          <p className="text-sm text-muted-foreground">
            Create automated workflows for your bookings
          </p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Create Automation
        </Button>
      </div>

      {automations.length === 0 ? (
        <Card className="p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Automations Coming Soon</h3>
          <p className="text-muted-foreground mb-6">
            Automate follow-ups, notifications, and more with powerful workflows
          </p>
          <Badge variant="secondary">Feature in Development</Badge>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Future: Automation list will go here */}
        </div>
      )}
    </div>
  );
};
