"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";

type PlanGateProps = {
  children: ReactNode;
  isAllowed: boolean;
  featureName: string;
};

export function PlanGate({ children, isAllowed, featureName }: PlanGateProps) {
  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Pro Feature</h2>
          <p className="text-muted-foreground">
            Upgrade to Pro to unlock {featureName} and enhance your workflow
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/pricing">
              Upgrade to Pro
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
