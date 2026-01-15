"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { EntitlementsProvider } from "@/contexts/EntitlementsContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance in state to ensure it's only created once
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <CurrencyProvider>
              <EntitlementsProvider>
                <DataProvider>
                  {children}
                  <Toaster />
                  <ShadcnToaster />
                </DataProvider>
              </EntitlementsProvider>
            </CurrencyProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
