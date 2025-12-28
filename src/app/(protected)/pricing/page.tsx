"use client";

export const dynamic = 'force-dynamic';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, X, Zap, Shield } from "lucide-react";
import { openWhopCheckout } from "@/lib/whopCheckout";
import { detectWhopContext } from "@/lib/embed";

type PlanFeature = {
  label: string;
  solo: { included: boolean; detail?: string };
  pro: { included: boolean; detail?: string };
  expert: { included: boolean; detail?: string };
};

type CheckoutPlan = "solo" | "pro";

const Pricing = () => {
  const env = process.env ?? {};
  const resolveCheckoutId = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = env[key];
      if (typeof value === "string" && value.trim() && value !== "undefined") {
        return value.trim();
      }
    }
    return undefined;
  };

  const resolveCheckoutOverride = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = env[key];
      if (typeof value === "string" && value.trim() && value !== "undefined") {
        return value.trim();
      }
    }
    return undefined;
  };

  const checkoutIds: Record<"solo" | "pro", string | undefined> = {
    solo: resolveCheckoutId([
      "NEXT_PUBLIC_WHOP_PLAN_SOLO",
      "NEXT_PUBLIC_WHOP_SOLO_PLAN_ID",
      "WHOP_PLAN_ID_SOLO",
    ]),
    pro: resolveCheckoutId([
      "NEXT_PUBLIC_WHOP_PLAN_PRO",
      "NEXT_PUBLIC_WHOP_PRO_PLAN_ID",
      "WHOP_PLAN_ID_PRO",
    ]),
  };

  const checkoutOverrides: Record<"solo" | "pro", string | undefined> = {
    solo: resolveCheckoutOverride([
      "NEXT_PUBLIC_WHOP_SOLO_CHECKOUT_URL",
      "WHOP_SOLO_CHECKOUT_URL",
    ]),
    pro: resolveCheckoutOverride([
      "NEXT_PUBLIC_WHOP_PRO_CHECKOUT_URL",
      "WHOP_PRO_CHECKOUT_URL",
    ]),
  };

  function getCheckoutUrl(kind: CheckoutPlan) {
    const override = checkoutOverrides[kind];
    if (override) {
      if (/^https?:\/\//i.test(override)) {
        return override;
      }
      return `https://whop.com/checkout/${override}`;
    }

    const id = checkoutIds[kind];
    if (!id) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Missing Whop checkout identifier for ${kind} plan. Set NEXT_PUBLIC_WHOP_PLAN_${kind.toUpperCase()} or WHOP_PLAN_ID_${kind.toUpperCase()}.`,
        );
      }
      return undefined;
    }
    return `https://whop.com/checkout/${id}`;
  }
  const [demoOpen, setDemoOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<CheckoutPlan | null>(null);
  const isWhop = typeof window !== "undefined" && detectWhopContext();

  const startCheckout = async (kind: CheckoutPlan) => {
    setCheckoutLoading(kind);
    try {
      if (isWhop) {
        const started = await openWhopCheckout(kind);
        if (started) {
          return;
        }
      }

      const fallbackUrl = getCheckoutUrl(kind);
      if (fallbackUrl) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        return;
      }

      console.warn(`[pricing] missing Whop checkout fallback for ${kind}`);
    } catch (error) {
      console.error("startCheckout failed", error);
    } finally {
      setCheckoutLoading(null);
    }
  };
  const features: PlanFeature[] = [
    {
      label: "Users/Seats",
      solo: { included: true, detail: "1" },
      pro: { included: true, detail: "5" },
      expert: { included: true, detail: "Unlimited" }
    },
    {
      label: "Scheduling Capacity",
      solo: { included: true, detail: "3 events / 30 bookings/mo" },
      pro: { included: true, detail: "10 events / 120 bookings/mo" },
      expert: { included: true, detail: "Unlimited" }
    },
    {
      label: "Integrations Bundle",
      solo: { included: true, detail: "Basic" },
      pro: { included: true, detail: "Included" },
      expert: { included: true, detail: "Included + custom" }
    },
    {
      label: "Questions & Forms",
      solo: { included: true, detail: "Up to 3" },
      pro: { included: true, detail: "Unlimited" },
      expert: { included: true, detail: "Unlimited" }
    },
    {
      label: "Call Tracking",
      solo: { included: true, detail: "Basic" },
      pro: { included: true, detail: "Included" },
      expert: { included: true, detail: "Advanced tracking" }
    },
    {
      label: "Goals Management",
      solo: { included: true, detail: "Personal" },
      pro: { included: true, detail: "Included" },
      expert: { included: true, detail: "Team goals" }
    },
    {
      label: "Analytics & Revenue",
      solo: { included: true, detail: "Basic analytics" },
      pro: { included: true, detail: "Advanced + CSV exports" },
      expert: { included: true, detail: "Advanced + API exports" }
    },
    {
      label: "Branding",
      solo: { included: false, detail: "Branding watermark" },
      pro: { included: true, detail: "Watermark removed" },
      expert: { included: true, detail: "White-label + multi" }
    },
    {
      label: "Support",
      solo: { included: true, detail: "Email, 72h" },
      pro: { included: true, detail: "Priority, 24–48h" },
      expert: { included: true, detail: "24/7 + manager" }
    }
  ];

  const plans = [
    {
      name: "Solo",
      price: "$19.99",
      period: "/month",
      description: "Per user, billed monthly",
      icon: Zap,
      buttonText: "Start free trial",
      buttonVariant: "default" as const,
      highlighted: false,
      getFeature: (feature: PlanFeature) => feature.solo
    },
    {
      name: "Pro",
      price: "$49",
      period: "/month",
      description: "Per user, billed monthly",
      badge: "Most popular",
      icon: Zap,
      buttonText: "Start free trial",
      buttonVariant: "default" as const,
      highlighted: true,
      getFeature: (feature: PlanFeature) => feature.pro
    },
    {
      name: "Expert",
      price: "Contact Sales",
      period: "",
      description: "For enterprise teams",
      icon: Shield,
      buttonText: "Let's have a demo",
      buttonVariant: "outline" as const,
      highlighted: false,
      getFeature: (feature: PlanFeature) => feature.expert
    }
  ];
  const faqs = [{
    question: "What happens when I exceed my interaction limit?",
    answer: "We'll notify you before you reach your limit. You can upgrade your plan at any time and use the advanced features to track sales, calls and conversions!"
  }, {
    question: "Can I change plans anytime?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
  }, {
    question: "Do you offer priority support & group chat support inside pro?",
    answer: "Yes! you get full support from the team to ensure your crm is working as it should to convert more sales!"
  }];
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <section className="mt-12">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-primary mb-2">Start with a 7 day free trial</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Everything in one place.</h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">No need for software elsewhere, everything you need in one place under one plan.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map(plan => {
            const isPro = plan.highlighted;
            
            if (isPro) {
              return (
                <div key={plan.name} className="group relative rounded-xl border border-black/10 bg-gradient-to-tr from-black/[0.85] via-black/[0.90] to-black/[0.95] ring-1 ring-black/[0.06] p-6 transition-all duration-300 hover:-translate-y-1 hover:ring-black/10 dark:border-white/10 dark:ring-white/5 dark:bg-gradient-to-tr dark:from-white/[0.06] dark:via-black/[0.2] dark:to-black/[0.4]">
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <div className="px-4 py-1 text-xs font-medium rounded-full bg-white text-neutral-900 ring-1 ring-black/20 dark:bg-neutral-900 dark:text-white dark:ring-white/10">
                        {plan.badge}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white dark:text-neutral-100">{plan.name}</h3>
                    {plan.icon && (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 ring-1 ring-white/20 dark:bg-white/10 dark:ring-white/10">
                        <plan.icon className="w-4 h-4 text-white dark:text-neutral-100" />
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-semibold text-white dark:text-white">{plan.price}</span>
                      {plan.period && <span className="ml-1 text-white/70 dark:text-neutral-300">{plan.period}</span>}
                    </div>
                    <p className="text-sm text-white/70 dark:text-neutral-300 mt-1">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {features.map((feature, index) => {
                      const planFeature = plan.getFeature(feature);
                      return (
                        <li key={index} className="flex items-center gap-3 text-sm">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10 shrink-0">
                            {planFeature.included ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-red-400" />
                            )}
                          </span>
                          <span className="text-white/90 dark:text-neutral-200">{feature.label}</span>
                          <span className="ml-auto text-white/60 dark:text-neutral-400 text-xs text-right shrink-0 whitespace-nowrap">{planFeature.detail}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <Button
                    className="w-full bg-white text-neutral-900 hover:bg-white/90 dark:bg-white dark:text-neutral-900"
                    disabled={checkoutLoading === "pro"}
                    onClick={() => startCheckout("pro")}
                  >
                    {checkoutLoading === "pro" ? "Opening checkout..." : plan.buttonText}
                  </Button>
                </div>
              );
            }

            // Free and Expert cards
            return (
              <Card key={plan.name} className="relative p-6 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  {plan.icon && (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                      <plan.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-semibold text-foreground">{plan.price}</span>
                    {plan.period && <span className="ml-1 text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {features.map((feature, index) => {
                    const planFeature = plan.getFeature(feature);
                    return (
                      <li key={index} className="flex items-center gap-3 text-sm">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-muted ring-1 ring-border/20 shrink-0">
                          {planFeature.included ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-red-500" />
                          )}
                        </span>
                        <span className="text-foreground">{feature.label}</span>
                        <span className="ml-auto text-muted-foreground text-xs text-right shrink-0 whitespace-nowrap">{planFeature.detail}</span>
                      </li>
                    );
                  })}
                </ul>

                <Button
                  variant={plan.buttonVariant}
                  className="w-full"
                  disabled={plan.name === "Solo" ? checkoutLoading === "solo" : false}
                  onClick={() => {
                    if (plan.name === "Solo") {
                      startCheckout("solo");
                    } else if (plan.name === "Expert") {
                      setDemoOpen(true);
                    }
                  }}
                >
                  {plan.name === "Solo" && checkoutLoading === "solo" ? "Opening checkout..." : plan.buttonText}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold tracking-tight text-center mb-8 text-foreground">
            Frequently asked questions
          </h3>
          <div className="space-y-6">
            {faqs.map((faq, index) => <Card key={index} className="p-6">
                <h4 className="font-medium mb-2 text-foreground">{faq.question}</h4>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </Card>)}
          </div>
        </div>
      </section>
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact us for a demo</DialogTitle>
            <DialogDescription>
              We’ll set up a personalized walkthrough and answer any questions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <a href="mailto:creatifiedlabs@gmail.com" className="text-primary hover:underline">creatifiedlabs@gmail.com</a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">X (Twitter)</span>
              <a href="https://x.com/creatifiedlabs" target="_blank" rel="noreferrer" className="text-primary hover:underline">@creatifiedlabs</a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Pricing;