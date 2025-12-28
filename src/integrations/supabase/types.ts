export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      availability_overrides: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          event_type_id: string | null
          id: string
          is_available: boolean
          start_time: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          event_type_id?: string | null
          id?: string
          is_available: boolean
          start_time?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          event_type_id?: string | null
          id?: string
          is_available?: boolean
          start_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          start_time: string
          timezone: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          start_time: string
          timezone?: string
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          start_time?: string
          timezone?: string
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      bookings: {
        Row: {
          answers: Json | null
          calendar_event_id: string | null
          cancel_token: string | null
          canceled_at: string | null
          canceled_reason: string | null
          chosen_call_type: string | null
          conversion_amount: number | null
          converted_at: string | null
          created_at: string | null
          end_time: string
          event_type_id: string
          host_user_id: string
          id: string
          invitee_email: string
          invitee_name: string
          invitee_phone: string | null
          invitee_timezone: string
          is_converted: boolean | null
          location_text: string | null
          notes: string | null
          notification_log: Json | null
          provider_pending: boolean | null
          reschedule_token: string | null
          start_time: string
          status: string
          updated_at: string | null
          video_join_url: string | null
          video_passcode: string | null
        }
        Insert: {
          answers?: Json | null
          calendar_event_id?: string | null
          cancel_token?: string | null
          canceled_at?: string | null
          canceled_reason?: string | null
          chosen_call_type?: string | null
          conversion_amount?: number | null
          converted_at?: string | null
          created_at?: string | null
          end_time: string
          event_type_id: string
          host_user_id: string
          id?: string
          invitee_email: string
          invitee_name: string
          invitee_phone?: string | null
          invitee_timezone: string
          is_converted?: boolean | null
          location_text?: string | null
          notes?: string | null
          notification_log?: Json | null
          provider_pending?: boolean | null
          reschedule_token?: string | null
          start_time: string
          status?: string
          updated_at?: string | null
          video_join_url?: string | null
          video_passcode?: string | null
        }
        Update: {
          answers?: Json | null
          calendar_event_id?: string | null
          cancel_token?: string | null
          canceled_at?: string | null
          canceled_reason?: string | null
          chosen_call_type?: string | null
          conversion_amount?: number | null
          converted_at?: string | null
          created_at?: string | null
          end_time?: string
          event_type_id?: string
          host_user_id?: string
          id?: string
          invitee_email?: string
          invitee_name?: string
          invitee_phone?: string | null
          invitee_timezone?: string
          is_converted?: boolean | null
          location_text?: string | null
          notes?: string | null
          notification_log?: Json | null
          provider_pending?: boolean | null
          reschedule_token?: string | null
          start_time?: string
          status?: string
          updated_at?: string | null
          video_join_url?: string | null
          video_passcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      call_audits: {
        Row: {
          actor_user_id: string | null
          after: Json
          before: Json | null
          call_id: string
          change_source: string
          id: string
          occurred_at: string
        }
        Insert: {
          actor_user_id?: string | null
          after: Json
          before?: Json | null
          call_id: string
          change_source: string
          id?: string
          occurred_at?: string
        }
        Update: {
          actor_user_id?: string | null
          after?: Json
          before?: Json | null
          call_id?: string
          change_source?: string
          id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_audits_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          assignee_user_id: string | null
          channel: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          conversion_amount: number
          conversion_currency: string
          converted: boolean | null
          converted_at: string | null
          created_at: string
          end_utc: string
          event_type_id: string | null
          id: string
          notes: string | null
          source: string
          start_utc: string
          status: string
          tenant_id: string
          updated_at: string
          utm: Json | null
        }
        Insert: {
          assignee_user_id?: string | null
          channel?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          conversion_amount?: number
          conversion_currency?: string
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          end_utc: string
          event_type_id?: string | null
          id?: string
          notes?: string | null
          source: string
          start_utc: string
          status?: string
          tenant_id?: string
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          assignee_user_id?: string | null
          channel?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          conversion_amount?: number
          conversion_currency?: string
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          end_utc?: string
          event_type_id?: string | null
          id?: string
          notes?: string | null
          source?: string
          start_utc?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_availability_rules: {
        Row: {
          created_at: string | null
          end_time: string
          event_type_id: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string | null
          end_time: string
          event_type_id: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string | null
          end_time?: string
          event_type_id?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_availability_rules_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_type_analytics: {
        Row: {
          created_at: string
          event_type_id: string
          id: string
          last_submitted_at: string | null
          last_viewed_at: string | null
          submission_count: number
          updated_at: string
          view_count: number
        }
        Insert: {
          created_at?: string
          event_type_id: string
          id?: string
          last_submitted_at?: string | null
          last_viewed_at?: string | null
          submission_count?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          event_type_id?: string
          id?: string
          last_submitted_at?: string | null
          last_viewed_at?: string | null
          submission_count?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_type_analytics_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: true
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          allowed_call_types: string[] | null
          buffer_after: number | null
          buffer_before: number | null
          capacity: number | null
          color: string | null
          created_at: string | null
          custom_link_label: string | null
          custom_link_url: string | null
          default_call_type: string | null
          description: string | null
          duration_minutes: number
          form_fields: Json | null
          id: string
          inperson_location: string | null
          invitee_form_schema: Json | null
          is_active: boolean
          is_archived: boolean
          is_secret: boolean | null
          location_details: Json | null
          location_type: string
          max_bookings_per_day: number | null
          min_notice_hours: number | null
          name: string
          notifications: Json | null
          phone_required_for_phone_type: boolean | null
          redirect_button_text: string | null
          redirect_url: string | null
          slug: string
          success_message: string | null
          templates: Json | null
          theme_mode: string | null
          time_increment: number | null
          timezone_mode: string | null
          updated_at: string | null
          use_custom_availability: boolean | null
          user_id: string
        }
        Insert: {
          allowed_call_types?: string[] | null
          buffer_after?: number | null
          buffer_before?: number | null
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          custom_link_label?: string | null
          custom_link_url?: string | null
          default_call_type?: string | null
          description?: string | null
          duration_minutes?: number
          form_fields?: Json | null
          id?: string
          inperson_location?: string | null
          invitee_form_schema?: Json | null
          is_active?: boolean
          is_archived?: boolean
          is_secret?: boolean | null
          location_details?: Json | null
          location_type?: string
          max_bookings_per_day?: number | null
          min_notice_hours?: number | null
          name: string
          notifications?: Json | null
          phone_required_for_phone_type?: boolean | null
          redirect_button_text?: string | null
          redirect_url?: string | null
          slug: string
          success_message?: string | null
          templates?: Json | null
          theme_mode?: string | null
          time_increment?: number | null
          timezone_mode?: string | null
          updated_at?: string | null
          use_custom_availability?: boolean | null
          user_id: string
        }
        Update: {
          allowed_call_types?: string[] | null
          buffer_after?: number | null
          buffer_before?: number | null
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          custom_link_label?: string | null
          custom_link_url?: string | null
          default_call_type?: string | null
          description?: string | null
          duration_minutes?: number
          form_fields?: Json | null
          id?: string
          inperson_location?: string | null
          invitee_form_schema?: Json | null
          is_active?: boolean
          is_archived?: boolean
          is_secret?: boolean | null
          location_details?: Json | null
          location_type?: string
          max_bookings_per_day?: number | null
          min_notice_hours?: number | null
          name?: string
          notifications?: Json | null
          phone_required_for_phone_type?: boolean | null
          redirect_button_text?: string | null
          redirect_url?: string | null
          slug?: string
          success_message?: string | null
          templates?: Json | null
          theme_mode?: string | null
          time_increment?: number | null
          timezone_mode?: string | null
          updated_at?: string | null
          use_custom_availability?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          created_at: string
          field_type: string
          form_id: string
          id: string
          label: string
          options: Json | null
          order_index: number
          placeholder: string | null
          required: boolean
        }
        Insert: {
          created_at?: string
          field_type: string
          form_id: string
          id?: string
          label: string
          options?: Json | null
          order_index?: number
          placeholder?: string | null
          required?: boolean
        }
        Update: {
          created_at?: string
          field_type?: string
          form_id?: string
          id?: string
          label?: string
          options?: Json | null
          order_index?: number
          placeholder?: string | null
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          assigned_to: string | null
          converted: boolean
          follow_up_date: string | null
          form_id: string
          id: string
          last_contact_date: string | null
          lead_score: number | null
          notes: string | null
          qualification_status: string | null
          scheduled_call_date: string | null
          scheduled_call_time: string | null
          status: string
          submission_data: Json
          submitted_at: string
        }
        Insert: {
          assigned_to?: string | null
          converted?: boolean
          follow_up_date?: string | null
          form_id: string
          id?: string
          last_contact_date?: string | null
          lead_score?: number | null
          notes?: string | null
          qualification_status?: string | null
          scheduled_call_date?: string | null
          scheduled_call_time?: string | null
          status?: string
          submission_data: Json
          submitted_at?: string
        }
        Update: {
          assigned_to?: string | null
          converted?: boolean
          follow_up_date?: string | null
          form_id?: string
          id?: string
          last_contact_date?: string | null
          lead_score?: number | null
          notes?: string | null
          qualification_status?: string | null
          scheduled_call_date?: string | null
          scheduled_call_time?: string | null
          status?: string
          submission_data?: Json
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          auto_qualify: boolean
          available_days: string[] | null
          available_hours: Json | null
          branding: Json | null
          checkout_url: string | null
          created_at: string
          deposit_amount: number | null
          deposit_required: boolean
          description: string | null
          enable_scheduling: boolean
          follow_up_config: Json | null
          follow_up_enabled: boolean
          form_type: string
          id: string
          is_active: boolean
          name: string
          qualification_rules: Json | null
          routing_rules: Json | null
          schedule_buffer: number | null
          schedule_duration: number | null
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_qualify?: boolean
          available_days?: string[] | null
          available_hours?: Json | null
          branding?: Json | null
          checkout_url?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_required?: boolean
          description?: string | null
          enable_scheduling?: boolean
          follow_up_config?: Json | null
          follow_up_enabled?: boolean
          form_type?: string
          id?: string
          is_active?: boolean
          name: string
          qualification_rules?: Json | null
          routing_rules?: Json | null
          schedule_buffer?: number | null
          schedule_duration?: number | null
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_qualify?: boolean
          available_days?: string[] | null
          available_hours?: Json | null
          branding?: Json | null
          checkout_url?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_required?: boolean
          description?: string | null
          enable_scheduling?: boolean
          follow_up_config?: Json | null
          follow_up_enabled?: boolean
          form_type?: string
          id?: string
          is_active?: boolean
          name?: string
          qualification_rules?: Json | null
          routing_rules?: Json | null
          schedule_buffer?: number | null
          schedule_duration?: number | null
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_accounts: {
        Row: {
          access_token: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          provider: string
          refresh_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      outbox_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          retry_count: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          retry_count?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          tenant_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          plan_tier: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_tier?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_tier?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_daily_call_stats: {
        Row: {
          booked: number
          cancelled: number
          completed: number
          converted: number
          date: string
          no_show: number
          revenue_amount: number
          revenue_currency: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          booked?: number
          cancelled?: number
          completed?: number
          converted?: number
          date: string
          no_show?: number
          revenue_amount?: number
          revenue_currency?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          booked?: number
          cancelled?: number
          completed?: number
          converted?: number
          date?: string
          no_show?: number
          revenue_amount?: number
          revenue_currency?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_totals: {
        Row: {
          calls_booked_total: number
          cancelled_total: number
          completed_total: number
          converted_total: number
          no_show_total: number
          revenue_currency: string
          revenue_total: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          calls_booked_total?: number
          cancelled_total?: number
          completed_total?: number
          converted_total?: number
          no_show_total?: number
          revenue_currency?: string
          revenue_total?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          calls_booked_total?: number
          cancelled_total?: number
          completed_total?: number
          converted_total?: number
          no_show_total?: number
          revenue_currency?: string
          revenue_total?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_blocks: {
        Row: {
          created_at: string | null
          date: string
          end_minutes: number
          event_type_id: string | null
          id: string
          note: string | null
          owner_user_id: string
          repeat_rule: Json | null
          scope: string
          start_minutes: number
          tz_at_create: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_minutes: number
          event_type_id?: string | null
          id?: string
          note?: string | null
          owner_user_id: string
          repeat_rule?: Json | null
          scope: string
          start_minutes: number
          tz_at_create?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_minutes?: number
          event_type_id?: string | null
          id?: string
          note?: string | null
          owner_user_id?: string
          repeat_rule?: Json | null
          scope?: string
          start_minutes?: number
          tz_at_create?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean | null
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          events: string[]
          id?: string
          is_active?: boolean | null
          secret: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_entitlements: { Args: { user_id_param: string }; Returns: Json }
      increment_event_type_submission: {
        Args: { event_type_id_param: string }
        Returns: undefined
      }
      increment_event_type_view: {
        Args: { event_type_id_param: string }
        Returns: undefined
      }
      rebuild_tenant_metrics: {
        Args: { p_from_date?: string; p_tenant_id: string; p_to_date?: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
