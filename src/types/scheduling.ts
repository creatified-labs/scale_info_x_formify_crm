export type CallType = 'zoom' | 'google_meet' | 'phone' | 'in_person' | 'custom';

export interface EventType {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  duration_minutes: number;
  location_type: CallType;
  location_details: Record<string, unknown>;
  is_active: boolean;
  buffer_before: number;
  buffer_after: number;
  min_notice_hours: number;
  max_bookings_per_day?: number;
  time_increment: number;
  is_secret: boolean;
  redirect_url?: string;
  form_fields: FormField[];
  timezone_mode: string;
  capacity: number;
  color: string;
  allowed_call_types: CallType[];
  default_call_type: CallType;
  invitee_form_schema: InviteeQuestion[];
  notifications: NotificationSettings;
  templates: NotificationTemplates;
  inperson_location?: string;
  custom_link_label?: string;
  custom_link_url?: string;
  phone_required_for_phone_type: boolean;
  use_custom_availability?: boolean; // DEPRECATED: Use availability_schedule_id instead
  availability_schedule_id?: string; // NEW: Which schedule to use (NULL = use default)
  theme_mode?: 'light' | 'dark' | 'auto';
  branding_hide_badge?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InviteeQuestion {
  id: string;
  type: 'short_text' | 'long_text' | 'email' | 'phone' | 'dropdown' | 'checkbox' | 'multi_select';
  label: string;
  placeholder?: string;
  required: boolean;
  helper_text?: string;
  options?: string[];
  maxSelections?: number | null;
  quizMode?: boolean;
  correctOptions?: string[];
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    confirmation: boolean;
    confirmationDelay?: number;
    reminders: number[];
    followup: number;
  };
  sms: {
    enabled: boolean;
    confirmation: boolean;
    confirmationDelay?: number;
    reminders: number[];
    followup: number;
  };
}

export interface NotificationTemplates {
  email: {
    confirmation: { subject: string; body: string };
    reminder: { subject: string; body: string };
    followup: { subject: string; body: string };
  };
  sms: {
    confirmation: string;
    reminder: string;
    followup: string;
  };
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'email' | 'phone';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface AvailabilitySchedule {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  timezone: string; // Timezone for this schedule (e.g., 'America/New_York', 'Europe/London')
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRule {
  id: string;
  schedule_id: string; // NEW: Rules now belong to a schedule
  user_id: string; // DEPRECATED: Kept for backwards compatibility
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
  created_at: string;
}

export interface AvailabilityOverride {
  id: string;
  schedule_id: string; // NEW: Overrides now belong to a schedule
  user_id: string; // DEPRECATED: Kept for backwards compatibility
  date: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  event_type_id?: string; // DEPRECATED: Removed in cleanup migration
  created_at: string;
}

export interface EventAvailabilityRule {
  // DEPRECATED: This table will be removed in cleanup migration
  // Event-specific availability is now handled by creating a named schedule
  id: string;
  event_type_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface Booking {
  id: string;
  event_type_id: string;
  host_user_id: string;
  invitee_name: string;
  invitee_email: string;
  invitee_phone?: string;
  invitee_timezone: string;
  answers?: Record<string, unknown> | null;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'canceled' | 'no_show' | 'hasnt_paid_yet';
  calendar_event_id?: string;
  video_join_url?: string;
  video_passcode?: string;
  reschedule_token?: string;
  cancel_token?: string;
  canceled_at?: string;
  canceled_reason?: string;
  chosen_call_type?: string;
  location_text?: string;
  provider_pending?: boolean;
  notification_log?: unknown[];
  created_at: string;
  updated_at: string;
}

export interface IntegrationAccount {
  id: string;
  user_id: string;
  provider: 'google_calendar' | 'outlook' | 'zoom' | 'google_meet';
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}
