"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

type UpsellCardProps = {
  feature: string;
  plan?: "Pro" | "Expert";
  description?: string;
};

export function UpsellCard({ feature, plan = "Pro", description }: UpsellCardProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">{plan} Feature</span>
        </div>
        <CardTitle className="text-xl">{feature}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade to {plan} to unlock this feature and enhance your workflow.
        </p>
        <Button asChild className="w-full gap-2">
          <Link href="/pricing">
            Upgrade to {plan}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
