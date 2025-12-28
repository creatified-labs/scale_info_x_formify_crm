export interface Form {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string | null;
  deposit_required: boolean;
  deposit_amount?: number | null;
  checkout_url?: string | null;
  branding?: Record<string, unknown>;
  is_active: boolean;
  form_type: 'standard' | 'scheduling' | 'hybrid';
  enable_scheduling: boolean;
  schedule_duration?: number;
  schedule_buffer?: number;
  available_days?: string[];
  available_hours?: { start: string; end: string };
  auto_qualify: boolean;
  qualification_rules?: Record<string, unknown>;
  routing_rules?: Record<string, unknown>;
  follow_up_enabled: boolean;
  follow_up_config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  form_id: string;
  label: string;
  field_type: string;
  placeholder?: string | null;
  required: boolean;
  options?: Record<string, unknown>;
  order_index: number;
  created_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  submission_data: Record<string, unknown>;
  submitted_at: string;
  status: string;
  notes?: string | null;
  converted: boolean;
  lead_score: number;
  qualification_status: 'unqualified' | 'qualified' | 'hot' | 'cold';
  assigned_to?: string;
  scheduled_call_date?: string;
  scheduled_call_time?: string;
  follow_up_date?: string;
  last_contact_date?: string;
}
