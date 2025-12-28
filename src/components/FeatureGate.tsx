"use client";

import { ReactNode } from "react";

type FeatureGateProps = {
  when: boolean;
  fallback?: ReactNode;
  children: ReactNode;
};

export function FeatureGate({ when, fallback = null, children }: FeatureGateProps) {
  return when ? <>{children}</> : <>{fallback}</>;
}
