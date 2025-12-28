"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const NotificationsSettings = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editForm, setEditForm] = useState({ subject: "", body: "" });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        const companyId = await getCompanyId({ allowFallback: false });
        if (!companyId) {
          setTemplates([]);
          return;
        }
        const { data, error } = await supabase
          .from("email_templates")
          .select("id, name, subject, body")
          .eq("company_id", companyId)
          .order("created_at", { ascending: true });
        if (error) {
          toast({ title: "Error", description: "Failed to load templates", variant: "destructive" });
        } else {
          setTemplates((data || []) as EmailTemplate[]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, [toast]);

  const handleChange = (key: "name" | "subject" | "body", value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast({ title: "Missing fields", description: "Name, subject and body are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const companyId = await getCompanyId({ allowFallback: false });
      if (!companyId) {
        toast({ title: "Error", description: "No company found", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase
        .from("email_templates")
        .insert({
          company_id: companyId,
          name: form.name.trim(),
          subject: form.subject.trim(),
          body: form.body.trim(),
        })
        .select("id, name, subject, body")
        .single();
      if (error) {
        toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
      } else if (data) {
        setTemplates([...templates, data as EmailTemplate]);
        setForm({ name: "", subject: "", body: "" });
        toast({ title: "Template saved", description: "You can now apply it from the bookings table" });
      }
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditForm({ subject: template.subject, body: template.body });
    setEditOpen(true);
  };

  const handleEditChange = (key: "subject" | "body", value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;
    if (!editForm.subject.trim() || !editForm.body.trim()) {
      toast({ title: "Missing fields", description: "Subject and body are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .update({
          subject: editForm.subject.trim(),
          body: editForm.body.trim(),
        })
        .eq("id", editingTemplate.id)
        .select("id, name, subject, body")
        .single();
      if (error) {
        toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
      } else if (data) {
        setTemplates((prev) => prev.map((t) => (t.id === data.id ? (data as EmailTemplate) : t)));
        setEditingTemplate(data as EmailTemplate);
        toast({ title: "Template updated", description: "Changes have been saved" });
        setEditOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const prev = templates;
    setTemplates(prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
      setTemplates(prev);
    }
  };

  const copyVariable = async (token: string) => {
    // Always insert into the body as a fallback so the click is useful even if clipboard is blocked
    setForm((prev) => ({
      ...prev,
      body: prev.body ? `${prev.body} ${token}` : token,
    }));

    try {
      if (navigator && "clipboard" in navigator) {
        await navigator.clipboard.writeText(token);
        toast({ title: "Copied", description: `${token} copied to clipboard` });
      }
    } catch (e) {
      // Ignore clipboard errors; the token is still inserted into the body
    }

    setCopiedToken(token);
    setTimeout(() => {
      setCopiedToken((current) => (current === token ? null : current));
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Input
                placeholder="Template name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
              <Input
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
              />
              <Textarea
                placeholder="Email body"
                rows={6}
                value={form.body}
                onChange={(e) => handleChange("body", e.target.value)}
              />
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Available variables (click to copy and paste into subject or body):</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => copyVariable("{{invitee_name}}")}
                  >
                    {copiedToken === "{{invitee_name}}" ? "Copied" : "{{invitee_name}}"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => copyVariable("{{event_name}}")}
                  >
                    {copiedToken === "{{event_name}}" ? "Copied" : "{{event_name}}"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => copyVariable("{{call_date}}")}
                  >
                    {copiedToken === "{{call_date}}" ? "Copied" : "{{call_date}}"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => copyVariable("{{call_time}}")}
                  >
                    {copiedToken === "{{call_time}}" ? "Copied" : "{{call_time}}"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => copyVariable("{{location}}")}
                  >
                    {copiedToken === "{{location}}" ? "Copied" : "{{location}}"}
                  </Button>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Saving..." : "Save template"}
              </Button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading templates...</p>
              ) : templates.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No templates yet. Create your first template on the left and it will appear here and in the bookings email dropdown.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.name}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{t.subject}</TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(t.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? `Edit template: ${editingTemplate.name}` : "Edit template"}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={editingTemplate.name} disabled />
              </div>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input
                  value={editForm.subject}
                  onChange={(e) => handleEditChange("subject", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Body</Label>
                <Textarea
                  rows={8}
                  value={editForm.body}
                  onChange={(e) => handleEditChange("body", e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving || !editingTemplate}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
