"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Star, Check, X, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { AvailabilitySchedule, AvailabilityRule } from "@/types/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TIMEZONES } from "@/lib/timezones";

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilitySchedulesManagerProps {
  onSelectSchedule: (scheduleId: string) => void;
  selectedScheduleId?: string;
  rules: AvailabilityRule[];
  onAddRule: (weekday: number) => void;
  onUpdateRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onRuleChange: (ruleId: string, field: string, value: string) => void;
}

export const AvailabilitySchedulesManager = ({
  onSelectSchedule,
  selectedScheduleId,
  rules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onRuleChange,
}: AvailabilitySchedulesManagerProps) => {
  const [schedules, setSchedules] = useState<AvailabilitySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [newScheduleTimezone, setNewScheduleTimezone] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSchedules = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("availability_schedules")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      });
      console.error("Load schedules error:", error);
    } else {
      setSchedules(data || []);

      // Auto-select default schedule if none selected
      if (!selectedScheduleId && data && data.length > 0) {
        const defaultSchedule = data.find((s) => s.is_default);
        if (defaultSchedule) {
          onSelectSchedule(defaultSchedule.id);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const createSchedule = async () => {
    if (!newScheduleName.trim()) return;

    const scheduleName = newScheduleName.trim(); // Store the name before clearing

    try {
      // Get current user to pass to edge proxy
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast({
          title: "Error",
          description: "Not authenticated",
          variant: "destructive",
        });
        return;
      }

      const res = await fetch('/api/edge-proxy', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          functionName: 'manage-availability-schedule',
          payload: {
            action: "create",
            name: scheduleName,
            is_default: schedules.length === 0, // First schedule is default
            timezone: newScheduleTimezone || undefined, // Falls back to user's profile timezone
            user_id: currentUser.id, // Explicitly pass user_id
          },
          method: 'POST',
        }),
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        console.error('Schedule creation failed:', { status: res.status, data });
        toast({
          title: "Error",
          description: data.error || data.message || `Failed to create schedule (${res.status})`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Schedule created",
        description: `"${scheduleName}" has been created`,
      });

      setNewScheduleName("");
      setNewScheduleTimezone("");
      setCreateDialogOpen(false);
      
      // Reload schedules without losing expansion state
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: schedData } = await supabase
          .from("availability_schedules")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("name");
        
        if (schedData) {
          setSchedules(schedData);
          // Auto-select and expand the newly created schedule
          const newSchedule = schedData.find(s => s.name === scheduleName);
          if (newSchedule) {
            onSelectSchedule(newSchedule.id);
            setExpandedScheduleId(newSchedule.id);
          }
        }
      }
    } catch (err: any) {
      console.error('Schedule creation error:', err);
      toast({
        title: "Error",
        description: err.message || "Network error creating schedule",
        variant: "destructive",
      });
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    if (
      !confirm(
        `Delete schedule "${schedule.name}"?\n\nThis will also delete all associated availability rules and date blocks.`
      )
    ) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch('/api/edge-proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        functionName: 'manage-availability-schedule',
        payload: {
          action: "delete",
          schedule_id: scheduleId,
          user_id: user.id,
        },
        method: 'POST',
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      toast({
        title: "Error",
        description: error.error || "Failed to delete schedule",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Schedule deleted",
      description: `"${schedule.name}" has been deleted`,
    });

    loadSchedules();
  };

  const updateSchedule = async (scheduleId: string, newName: string, newTimezone?: string) => {
    if (!newName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: any = {
      action: "update",
      schedule_id: scheduleId,
      name: newName.trim(),
      user_id: user.id,
    };

    // Only include timezone if it was changed
    if (newTimezone !== undefined && newTimezone !== "") {
      payload.timezone = newTimezone;
    }

    const res = await fetch('/api/edge-proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        functionName: 'manage-availability-schedule',
        payload,
        method: 'POST',
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      toast({
        title: "Error",
        description: error.error || "Failed to update schedule",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Schedule updated",
    });

    setEditingId(null);
    setEditName("");
    setEditTimezone("");
    loadSchedules();
  };

  const setAsDefault = async (scheduleId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch('/api/edge-proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        functionName: 'manage-availability-schedule',
        payload: {
          action: "set_default",
          schedule_id: scheduleId,
          user_id: user.id,
        },
        method: 'POST',
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      toast({
        title: "Error",
        description: error.error || "Failed to set default",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Default schedule updated",
    });

    loadSchedules();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Loading schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Availability Schedules</h3>
          <p className="text-sm text-muted-foreground">
            Create named schedules for different availability patterns (e.g., "Working Hours", "Weekend Hours")
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Availability Schedule</DialogTitle>
              <DialogDescription>
                Give your schedule a name and timezone. Perfect for teams in different locations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-name">Schedule Name</Label>
                <Input
                  id="schedule-name"
                  placeholder="e.g., 'London Hours' or 'SF Team'"
                  value={newScheduleName}
                  onChange={(e) => setNewScheduleName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createSchedule();
                  }}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-timezone">Timezone (Optional)</Label>
                <Select value={newScheduleTimezone} onValueChange={setNewScheduleTimezone}>
                  <SelectTrigger id="schedule-timezone">
                    <SelectValue placeholder="Select timezone (defaults to your account timezone)" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Availability times will be interpreted in this timezone
                </p>
              </div>
              <Button onClick={createSchedule} className="w-full">
                Create Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {schedules.map((schedule) => {
          const isExpanded = expandedScheduleId === schedule.id;
          const isSelected = selectedScheduleId === schedule.id;
          
          return (
            <Card
              key={schedule.id}
              className={`transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:border-primary/50"
              }`}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => {
                  onSelectSchedule(schedule.id);
                  setExpandedScheduleId(isExpanded ? null : schedule.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {editingId === schedule.id ? (
                      <div className="flex flex-col gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateSchedule(schedule.id, editName, editTimezone);
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditName("");
                                setEditTimezone("");
                              }
                            }}
                            placeholder="Schedule name"
                            autoFocus
                            className="h-8"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSchedule(schedule.id, editName, editTimezone);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(null);
                              setEditName("");
                              setEditTimezone("");
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <Select value={editTimezone} onValueChange={setEditTimezone}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Change timezone (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div>
                          <h4 className="font-semibold">{schedule.name}</h4>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Globe className="w-3 h-3" />
                            <span>{schedule.timezone}</span>
                          </div>
                        </div>
                        {schedule.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Default
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {editingId !== schedule.id && (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!schedule.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAsDefault(schedule.id)}
                          title="Set as default schedule"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(schedule.id);
                          setEditName(schedule.name);
                          setEditTimezone(schedule.timezone);
                        }}
                        title="Edit schedule"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSchedule(schedule.id)}
                        disabled={schedule.is_default && schedules.length === 1}
                        title={
                          schedule.is_default && schedules.length === 1
                            ? "Cannot delete the only schedule"
                            : "Delete schedule"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSchedule(schedule.id);
                          setExpandedScheduleId(isExpanded ? null : schedule.id);
                        }}
                        title={isExpanded ? "Collapse" : "Expand to edit hours"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && isSelected && (
                <div className="px-4 pb-4 space-y-3 border-t pt-4">
                  <div className="mb-2">
                    <p className="text-sm font-medium">Availability Hours</p>
                    <p className="text-xs text-muted-foreground">Set your available hours for this schedule</p>
                  </div>
                  {WEEKDAYS.map((day, idx) => {
                    const dayRules = rules.filter(r => r.weekday === idx);
                    
                    return (
                      <Card key={idx} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm">{day}</h5>
                          {dayRules.length === 0 ? (
                            <Badge variant="secondary" className="text-xs">Unavailable</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>

                        {dayRules.length === 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => onAddRule(idx)}
                          >
                            <Plus className="w-3 h-3 mr-2" />
                            Set Hours
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            {dayRules.map((rule) => (
                              <div key={rule.id} className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={rule.start_time}
                                  onChange={(e) => onRuleChange(rule.id, 'start_time', e.target.value)}
                                  onBlur={() => onUpdateRule(rule.id)}
                                  className="w-28 h-8 text-sm"
                                />
                                <span className="text-xs text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  value={rule.end_time}
                                  onChange={(e) => onRuleChange(rule.id, 'end_time', e.target.value)}
                                  onBlur={() => onUpdateRule(rule.id)}
                                  className="w-28 h-8 text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onDeleteRule(rule.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}

        {schedules.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No availability schedules yet. Click "New Schedule" to create one.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
