"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Calendar, Star } from "lucide-react";
import { FormSubmission } from "@/types/forms";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadQualification, getQualificationBadge } from "./LeadQualification";

interface FormSubmissionsProps {
  formId: string;
  onBack: () => void;
}

export const FormSubmissions = ({ formId, onBack }: FormSubmissionsProps) => {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, [formId]);

  const loadSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("form_submissions")
      .select("*")
      .eq("form_id", formId)
      .order("submitted_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } else {
      setSubmissions((data || []) as FormSubmission[]);
    }
    setLoading(false);
  };

  const updateStatus = async (submissionId: string, status: string) => {
    const { error } = await supabase
      .from("form_submissions")
      .update({ status, converted: status === "converted" })
      .eq("id", submissionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      loadSubmissions();
      toast({
        title: "Success",
        description: "Status updated",
      });
    }
  };

  const saveNotes = async (submissionId: string) => {
    const { error } = await supabase
      .from("form_submissions")
      .update({ notes })
      .eq("id", submissionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    } else {
      setEditingNotes(null);
      loadSubmissions();
      toast({
        title: "Success",
        description: "Notes saved",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500",
      contacted: "bg-yellow-500",
      converted: "bg-green-500",
      closed: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const conversions = submissions.filter(s => s.converted).length;
  const conversionRate = submissions.length > 0 
    ? ((conversions / submissions.length) * 100).toFixed(1)
    : "0";

  if (loading) {
    return <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <p className="text-muted-foreground">Loading submissions...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Lead Management</h1>
            <p className="text-muted-foreground">
              Track and qualify your leads
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <LeadQualification submissions={submissions} />

        {/* Submissions List */}
        {submissions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No submissions yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id} className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    {Object.entries(submission.submission_data).map(([key, value]) => (
                      <div key={key} className="flex gap-3">
                        <span className="font-medium text-sm min-w-[100px]">
                          {key}:
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                      <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
                      {submission.scheduled_call_date && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <Calendar className="w-3 h-3" />
                          <span>Call: {new Date(submission.scheduled_call_date).toLocaleDateString()} at {submission.scheduled_call_time}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold">{submission.lead_score}</span>
                    </div>
                    {getQualificationBadge(submission.qualification_status)}
                    <Select
                      value={submission.status}
                      onValueChange={(value) => updateStatus(submission.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    {submission.converted && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Converted
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Notes Section */}
                <div className="border-t pt-4">
                  {editingNotes === submission.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this lead..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveNotes(submission.id)}
                        >
                          Save Notes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNotes(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {submission.notes ? (
                        <div
                          className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded"
                          onClick={() => {
                            setEditingNotes(submission.id);
                            setNotes(submission.notes || "");
                          }}
                        >
                          {submission.notes}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNotes(submission.id);
                            setNotes("");
                          }}
                        >
                          Add Notes
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
