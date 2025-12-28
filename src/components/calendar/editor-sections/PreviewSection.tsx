"use client";

import { LivePreviewSection } from "./LivePreviewSection";
import { EventType } from "@/types/scheduling";

interface PreviewSectionProps {
  data: Partial<EventType>;
}

export const PreviewSection = ({ data }: PreviewSectionProps) => {
  return <LivePreviewSection data={data} />;
};
