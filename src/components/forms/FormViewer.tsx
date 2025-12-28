"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField } from "@/types/forms";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";
import { BookingCalendar } from "./BookingCalendar";
import { PoweredByBadge } from "@/components/PoweredByBadge";
import { Entitlements } from "@/hooks/useEntitlements";
import { usePreviewMode } from "@/components/PreviewModeToggle";

interface FormViewerProps {
  slug: string;
}

export const FormViewer = ({ slug }: FormViewerProps) => {
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [ownerEntitlements, setOwnerEntitlements] = useState<Entitlements | null>(null);
  const previewMode = usePreviewMode();
  const { toast } = useToast();

  useEffect(() => {
    loadForm();
  }, [slug]);

  const loadForm = async () => {
    setLoading(true);
    
    const { data: formData, error: formError } = await supabase
      .from("forms")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (formError || !formData) {
      toast({
        title: "Error",
        description: "Form not found",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: fieldsData } = await supabase
      .from("form_fields")
      .select("*")
      .eq("form_id", formData.id)
      .order("order_index");

    // Fetch owner entitlements
    const { data: entitlementsData } = await supabase.rpc('get_user_entitlements', {
      user_id_param: formData.user_id
    });
    
    if (entitlementsData) {
      setOwnerEntitlements(entitlementsData as Entitlements);
    }

    setForm(formData as any as Form);
    setFields(fieldsData || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate required fields
    const missingFields = fields
      .filter((f) => f.required && (!formData[f.id] || formData[f.id].trim().length === 0))
      .map((f) => f.label);

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validate field content and sizes
    for (const field of fields) {
      const value = formData[field.id];
      if (!value) continue;

      // Size limit per field
      if (value.length > 5000) {
        toast({
          title: "Input too long",
          description: `${field.label} must be less than 5000 characters`,
          variant: "destructive",
        });
        return;
      }

      // Email validation for email fields
      if (field.field_type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          toast({
            title: "Invalid email",
            description: `Please enter a valid email for ${field.label}`,
            variant: "destructive",
          });
          return;
        }
      }

      // Phone validation for tel fields
      if (field.field_type === 'tel') {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          toast({
            title: "Invalid phone number",
            description: `Please enter a valid phone number for ${field.label}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Convert field IDs to labels for storage with sanitization
      const submissionData: Record<string, string> = {};
      fields.forEach((field) => {
        if (formData[field.id]) {
          // Trim and limit size as defense-in-depth
          submissionData[field.label] = formData[field.id].trim().substring(0, 5000);
        }
      });

      const { error } = await supabase.from("form_submissions").insert({
        form_id: form.id,
        submission_data: submissionData,
        scheduled_call_date: scheduledDate?.toISOString(),
        scheduled_call_time: scheduledTime,
        status: 'new',
      });

      if (error) throw error;

      // Handle checkout redirect with security validation
      if (form.deposit_required && form.checkout_url) {
        try {
          const url = new URL(form.checkout_url);
          
          // Validate it's HTTPS
          if (url.protocol !== 'https:') {
            throw new Error('Checkout URL must use HTTPS');
          }

          // List of trusted payment processor domains
          const trustedDomains = [
            'stripe.com',
            'checkout.stripe.com',
            'paypal.com',
            'checkout.paypal.com',
            'square.link',
            'gumroad.com',
          ];

          // Check if the domain is trusted
          const isTrusted = trustedDomains.some(trusted => 
            url.hostname === trusted || url.hostname.endsWith(`.${trusted}`)
          );

          if (isTrusted) {
            // Redirect to trusted payment processor
            window.location.href = form.checkout_url;
          } else {
            // Show warning for external URLs
            const proceed = confirm(
              `You're being redirected to: ${url.hostname}\n\n` +
              `This is an external payment processor. ` +
              `Please verify this is the correct website before entering payment information.\n\n` +
              `Continue to ${url.hostname}?`
            );
            
            if (proceed) {
              window.location.href = form.checkout_url;
            } else {
              setSubmitted(true);
            }
          }
        } catch (error) {
          toast({
            title: "Invalid checkout URL",
            description: "The payment URL is invalid. Please contact the form owner.",
            variant: "destructive",
          });
          setSubmitted(true);
        }
      } else {
        setSubmitted(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
          <p className="text-muted-foreground">
            This form doesn't exist or has been deactivated.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Thank You!</h2>
          <p className="text-muted-foreground">
            Your submission has been received. We'll get back to you soon.
          </p>
        </Card>
      </div>
    );
  }

  // Determine if badge should show based on preview mode or actual entitlements
  const showBadge = previewMode === "solo" 
    ? true 
    : previewMode === "pro" 
    ? false 
    : ownerEntitlements?.branding_domain === "powered_by_badge";

  // For scheduling forms, show split layout
  if (form.enable_scheduling) {
    return (
      <div className="min-h-screen bg-background">
        {showBadge && <PoweredByBadge />}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left: Form */}
            <div className="p-6 lg:p-10">
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">{form.name}</h1>
                  {form.description && (
                    <p className="text-muted-foreground">{form.description}</p>
                  )}
                  {form.deposit_required && (
                    <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="font-semibold">
                        Deposit Required: £{form.deposit_amount}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You'll be redirected to payment after booking
                      </p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {fields.map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.field_type === "textarea" ? (
                        <Textarea
                          id={field.id}
                          placeholder={field.placeholder || ''}
                          value={formData[field.id] || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, [field.id]: e.target.value })
                          }
                          required={field.required}
                        />
                      ) : (
                        <Input
                          id={field.id}
                          type={field.field_type}
                          placeholder={field.placeholder || ''}
                          value={formData[field.id] || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, [field.id]: e.target.value })
                          }
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={submitting || !scheduledDate || !scheduledTime}
                  >
                    {submitting ? "Booking..." : "Confirm Booking"}
                  </Button>
                </form>
              </div>
            </div>

            {/* Right: Calendar */}
            <div className="lg:border-l border-t lg:border-t-0 border-border p-6 lg:p-10">
              <BookingCalendar
                form={form}
                selectedDate={scheduledDate}
                selectedTime={scheduledTime}
                onDateSelect={(date) => {
                  setScheduledDate(date);
                  setScheduledTime(null);
                }}
                onTimeSelect={(time) => {
                  setScheduledTime(time);
                }}
                renderCalendar={true}
                renderTimesColumn={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For standard forms, show traditional layout
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      {showBadge && <PoweredByBadge />}
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{form.name}</h1>
            {form.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
            {form.deposit_required && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                <p className="font-semibold">
                  Deposit Required: £{form.deposit_amount}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll be redirected to payment after submitting
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {fields.map((field) => (
              <div key={field.id}>
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.field_type === "textarea" ? (
                  <Textarea
                    id={field.id}
                    placeholder={field.placeholder || undefined}
                    value={formData[field.id] || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.id]: e.target.value })
                    }
                    required={field.required}
                  />
                ) : (
                  <Input
                    id={field.id}
                    type={field.field_type}
                    placeholder={field.placeholder || undefined}
                    value={formData[field.id] || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.id]: e.target.value })
                    }
                    required={field.required}
                  />
                )}
              </div>
            ))}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
