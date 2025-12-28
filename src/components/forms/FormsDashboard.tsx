"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Edit, Trash2, Copy } from "lucide-react";
import { Form } from "@/types/forms";
import { FormBuilder } from "./FormBuilder";
import { FormSubmissions } from "./FormSubmissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FormsDashboardProps {
  forms: Form[];
  onRefresh: () => void;
}

export const FormsDashboard = ({ forms, onRefresh }: FormsDashboardProps) => {
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const { toast } = useToast();

  const copyFormLink = (slug: string) => {
    const link = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Form link copied to clipboard",
    });
  };

  const handleDelete = async (formId: string) => {
    const { error } = await supabase
      .from("forms")
      .delete()
      .eq("id", formId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete form",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Form deleted successfully",
      });
      onRefresh();
    }
    setDeleteFormId(null);
  };

  if (viewingSubmissions) {
    return (
      <FormSubmissions
        formId={viewingSubmissions}
        onBack={() => setViewingSubmissions(null)}
      />
    );
  }

  if (isCreating || selectedForm) {
    return (
      <FormBuilder
        form={selectedForm}
        onClose={() => {
          setIsCreating(false);
          setSelectedForm(null);
          onRefresh();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Forms</h1>
            <p className="text-muted-foreground">Create lead capture forms with scheduling & qualification</p>
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Form
          </Button>
        </div>

        {/* Forms Grid */}
        {forms.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first form to start capturing leads
            </p>
            <Button onClick={() => setIsCreating(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Form
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forms.map((form) => (
              <Card key={form.id} className="p-6 space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{form.name}</h3>
                    {form.enable_scheduling && (
                      <Badge className="bg-purple-500 text-white">Scheduling</Badge>
                    )}
                  </div>
                  {form.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {form.description}
                    </p>
                  )}
                  <div className="mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    /{form.slug}
                  </div>
                </div>

                {form.deposit_required && (
                  <div className="text-sm text-muted-foreground">
                    Deposit: £{form.deposit_amount}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => copyFormLink(form.slug)}
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/f/${form.slug}`, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewingSubmissions(form.id)}
                  >
                    View Submissions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedForm(form)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteFormId(form.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteFormId} onOpenChange={() => setDeleteFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently delete the form and all its submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteFormId && handleDelete(deleteFormId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
