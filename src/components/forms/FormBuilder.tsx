"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { Form, FormField } from "@/types/forms";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FormBuilderProps {
  form: Form | null;
  onClose: () => void;
}

export const FormBuilder = ({ form, onClose }: FormBuilderProps) => {
  const [name, setName] = useState(form?.name || "");
  const [slug, setSlug] = useState(form?.slug || "");
  const [description, setDescription] = useState(form?.description || "");
  const [depositRequired, setDepositRequired] = useState(form?.deposit_required || false);
  const [depositAmount, setDepositAmount] = useState(form?.deposit_amount?.toString() || "");
  const [checkoutUrl, setCheckoutUrl] = useState(form?.checkout_url || "");
  const [enableScheduling, setEnableScheduling] = useState(form?.enable_scheduling || false);
  const [scheduleDuration, setScheduleDuration] = useState(form?.schedule_duration?.toString() || "30");
  const [fields, setFields] = useState<Partial<FormField>[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (form) {
      loadFields();
    } else {
      // Add default fields for new form
      setFields([
        { label: "Name", field_type: "text", required: true, order_index: 0 },
        { label: "Email", field_type: "email", required: true, order_index: 1 },
        { label: "Phone", field_type: "phone", required: false, order_index: 2 },
      ]);
    }
  }, [form]);

  const loadFields = async () => {
    if (!form) return;
    const { data } = await supabase
      .from("form_fields")
      .select("*")
      .eq("form_id", form.id)
      .order("order_index");
    if (data) setFields(data);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        label: "",
        field_type: "text",
        required: false,
        order_index: fields.length,
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((field, i) => (i === index ? { ...field, ...updates } : field)));
  };

  const handleSave = async () => {
    if (!name || !slug) {
      toast({
        title: "Error",
        description: "Name and slug are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const formData = {
        name,
        slug,
        description,
        deposit_required: depositRequired,
        deposit_amount: depositRequired ? parseFloat(depositAmount) : null,
        checkout_url: checkoutUrl || null,
        enable_scheduling: enableScheduling,
        schedule_duration: enableScheduling ? parseInt(scheduleDuration) : 30,
        form_type: enableScheduling ? 'scheduling' : 'standard',
        user_id: user.id,
      };

      let formId = form?.id;

      if (form) {
        // Update existing form
        const { error } = await supabase
          .from("forms")
          .update(formData)
          .eq("id", form.id);
        if (error) throw error;

        // Delete existing fields
        await supabase.from("form_fields").delete().eq("form_id", form.id);
      } else {
        // Create new form
        const { data, error } = await supabase
          .from("forms")
          .insert(formData)
          .select()
          .single();
        if (error) throw error;
        formId = data.id;
      }

      // Insert fields
      if (formId) {
        const fieldsData = fields.map((field, index) => ({
          form_id: formId,
          label: field.label || "",
          field_type: field.field_type || "text",
          placeholder: field.placeholder,
          required: field.required || false,
          options: field.options,
          order_index: index,
        }));

        const { error } = await supabase.from("form_fields").insert(fieldsData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Form ${form ? "updated" : "created"} successfully`,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {form ? "Edit Form" : "Create New Form"}
            </h1>
            <p className="text-muted-foreground">Configure your lead capture form</p>
          </div>
        </div>

        {/* Form Settings */}
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="name">Form Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!form) setSlug(generateSlug(e.target.value));
              }}
              placeholder="Contact Form"
            />
          </div>

          <div>
            <Label htmlFor="slug">URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/f/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="contact-form"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your form"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={depositRequired}
              onCheckedChange={setDepositRequired}
            />
            <Label>Require Deposit</Label>
          </div>

          {depositRequired && (
            <>
              <div>
                <Label htmlFor="amount">Deposit Amount (£)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="50.00"
                />
              </div>
              <div>
                <Label htmlFor="checkout">Checkout URL</Label>
                <Input
                  id="checkout"
                  value={checkoutUrl}
                  onChange={(e) => setCheckoutUrl(e.target.value)}
                  placeholder="https://checkout.stripe.com/..."
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-3 pt-4 border-t">
            <Switch
              checked={enableScheduling}
              onCheckedChange={setEnableScheduling}
            />
            <Label>Enable Calendar Scheduling</Label>
          </div>

          {enableScheduling && (
            <div>
              <Label htmlFor="duration">Call Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={scheduleDuration}
                onChange={(e) => setScheduleDuration(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This form will show a calendar for booking calls
              </p>
            </div>
          )}
        </Card>

        {/* Form Fields */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Form Fields</h2>
            <Button size="sm" variant="outline" onClick={addField}>
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Field label"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                  />
                  <Select
                    value={field.field_type}
                    onValueChange={(value) => updateField(index, { field_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="textarea">Text Area</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) => updateField(index, { required: checked })}
                    />
                    <span className="text-sm">Required</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeField(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Form"}
          </Button>
        </div>
      </div>
    </div>
  );
};
