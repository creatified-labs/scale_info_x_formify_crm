"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Check } from "lucide-react";

export type PreviewMode = "preview" | "solo" | "pro";
export type PreviewModeState = PreviewMode | "live";

export const PreviewModeToggle = () => {
  const [previewMode, setPreviewMode] = useState<PreviewModeState>(() => {
    if (typeof window === "undefined") return "live";
    const stored = localStorage.getItem("previewMode");
    if (stored === "none" || stored === "live") return "live"; // migrate legacy value
    if (stored === "solo" || stored === "pro" || stored === "preview") {
      return stored as PreviewMode;
    }
    return "live";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (previewMode === "live") {
      localStorage.removeItem("previewMode");
    } else {
      localStorage.setItem("previewMode", previewMode);
    }
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent<PreviewModeState>("previewModeChange", { detail: previewMode }));
  }, [previewMode]);

  const label =
    previewMode === "preview"
      ? "Preview: Free"
      : previewMode === "solo"
      ? "Preview: Solo"
      : previewMode === "pro"
      ? "Preview: Pro"
      : "Current plan";

  const toggleMode = (mode: PreviewMode) => {
    setPreviewMode((current) => (current === mode ? "live" : mode));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background z-50">
        <DropdownMenuItem onClick={() => toggleMode("preview")}>
          {previewMode === "preview" && <Check className="w-4 h-4 mr-2" />}
          {previewMode !== "preview" && <span className="w-4 h-4 mr-2" />}
          Free Plan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleMode("solo")}>
          {previewMode === "solo" && <Check className="w-4 h-4 mr-2" />}
          {previewMode !== "solo" && <span className="w-4 h-4 mr-2" />}
          Solo Plan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleMode("pro")}>
          {previewMode === "pro" && <Check className="w-4 h-4 mr-2" />}
          {previewMode !== "pro" && <span className="w-4 h-4 mr-2" />}
          Pro Plan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Helper hook to get current preview mode
export const usePreviewMode = () => {
  const [previewMode, setPreviewMode] = useState<PreviewModeState>(() => {
    if (typeof window === "undefined") return "live";
    const stored = localStorage.getItem("previewMode");
    if (stored === "solo" || stored === "pro" || stored === "preview") {
      return stored as PreviewMode;
    }
    return "live";
  });

  useEffect(() => {
    const handlePreviewModeChange = (event: Event) => {
      const custom = event as CustomEvent<PreviewModeState>;
      setPreviewMode(custom.detail);
    };

    window.addEventListener("previewModeChange", handlePreviewModeChange as EventListener);
    return () => {
      window.removeEventListener("previewModeChange", handlePreviewModeChange as EventListener);
    };
  }, []);

  return previewMode;
};
