"use client";

import { createContext, ReactNode, useContext } from "react";

export type BrandingContextValue = {
  productName: string;
};

const BrandingContext = createContext<BrandingContextValue>({ productName: "" });

export function BrandingProvider({ value, children }: { value: BrandingContextValue; children: ReactNode; }) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context;
}
