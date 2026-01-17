"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { EmbedOption1 } from "@/components/embed/EmbedOption1";
import { EmbedOption2 } from "@/components/embed/EmbedOption2";
import { EmbedOption3 } from "@/components/embed/EmbedOption3";
import type { EventType } from "@/types/scheduling";
import { DEFAULT_PRODUCT_SEGMENT } from "@/lib/urls";

export default function EmbedBookingPage() {
  const params = useParams<{ slug: string; product?: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const rawProduct = params.product;
  const product = typeof rawProduct === "string" && rawProduct.trim().length > 0 ? rawProduct.trim() : DEFAULT_PRODUCT_SEGMENT;
  
  const embedType = searchParams.get("type") || "option1";
  const isPreviewMode = searchParams.get("preview") === "true";
  const [eventType, setEventType] = useState<(EventType & { branding_hide_badge?: boolean, user_timezone?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const embedCustomization = useMemo(() => {
    return {
      hideBranding: searchParams.get("hide_branding") === "true",
      primaryColor: searchParams.get("primary_color") || null,
      hideHeader: searchParams.get("hide_header") === "true",
    };
  }, [searchParams]);

  const prefillData = useMemo(() => {
    return {
      name: searchParams.get("prefill_name") || "",
      email: searchParams.get("prefill_email") || "",
      phone: searchParams.get("prefill_phone") || "",
    };
  }, [searchParams]);

  const previewOverrides = useMemo(() => {
    if (!isPreviewMode) return null;
    
    const overrides: any = {};
    
    const name = searchParams.get("name");
    const description = searchParams.get("description");
    const duration = searchParams.get("duration");
    const questionsJson = searchParams.get("questions");
    
    if (name) overrides.name = name;
    if (description) overrides.description = description;
    if (duration) overrides.duration_minutes = parseInt(duration);
    if (questionsJson) {
      try {
        overrides.invitee_form_schema = JSON.parse(questionsJson);
      } catch (e) {
        console.error("Failed to parse questions JSON", e);
      }
    }
    
    return overrides;
  }, [isPreviewMode, searchParams]);

  useEffect(() => {
    loadEventType();
  }, [slug, product, previewOverrides]);

  useEffect(() => {
    if (!eventType) return;
    
    const themeMode = eventType.theme_mode || 'auto';
    const root = document.documentElement;
    
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else if (themeMode === 'light') {
      root.classList.remove('dark');
    }
  }, [eventType]);

  const loadEventType = async () => {
    if (!slug) return;

    setLoading(true);
    try {
      const search = new URLSearchParams({ slug });
      if (product) {
        search.set("product", product);
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/public-get-event-type?${search.toString()}`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error("event not found");
      }
      const body = await res.json();
      const fetched = body?.event_type as (EventType & { companies?: { branding_hide_badge?: boolean }, profiles?: { timezone?: string } }) | null;
      if (!fetched) {
        throw new Error("event not found");
      }
      const baseEventType = {
        ...fetched,
        branding_hide_badge: embedCustomization.hideBranding || fetched.companies?.branding_hide_badge ?? fetched.branding_hide_badge ?? false,
        user_timezone: fetched.profiles?.timezone || 'UTC',
      };
      
      const finalEventType = previewOverrides ? { ...baseEventType, ...previewOverrides } : baseEventType;
      setEventType(finalEventType);
    } catch (error) {
      setError("Event type not found");
      setEventType(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !eventType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground">
            This event type doesn't exist or has been deactivated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {embedType === "option1" && <EmbedOption1 eventType={eventType} prefillData={prefillData} embedCustomization={embedCustomization} />}
      {embedType === "option2" && <EmbedOption2 eventType={eventType} prefillData={prefillData} embedCustomization={embedCustomization} />}
      {embedType === "option3" && <EmbedOption3 eventType={eventType} prefillData={prefillData} embedCustomization={embedCustomization} />}
    </>
  );
}
