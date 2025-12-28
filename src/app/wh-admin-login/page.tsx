"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Users,
  BarChart3,
  PlugZap,
  UserCircle,
  ExternalLink,
  Repeat2,
} from "lucide-react";

interface TenantOwner {
  user_id: string;
  email: string | null;
  login_email: string | null;
  company_name: string | null;
  whop_org_id: string | null;
  last_sign_in_at: string | null;
}

interface TenantTotals {
  tenant_id: string;
  calls_booked_total: number;
  completed_total: number;
  no_show_total: number;
  cancelled_total: number;
  converted_total: number;
  revenue_total: number;
  revenue_currency: string;
  updated_at: string;
}

interface TenantRecord {
  company_id: string;
  name: string;
  plan_id: string;
  created_at: string;
  whop_org_id: string | null;
  slug: string;
  branding_name: string | null;
  owner: TenantOwner | null;
  usage: {
    events: number;
    bookings_current_month: number;
    forms: number;
    tenant_totals: TenantTotals | null;
  };
  alerts: string[];
  recent_errors: { event: string; metadata: Record<string, unknown>; created_at: string }[];
  latest_activity: string | null;
}

const API_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-overview`;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function WhAdminLogin() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const basicHeader = authToken ?? (username && password ? btoa(`${username}:${password}`) : null);

  const fetchTenants = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!basicHeader) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicHeader}`,
        };
        if (SUPABASE_ANON_KEY) {
          headers.apikey = SUPABASE_ANON_KEY;
        }

        const res = await fetch(API_URL, {
          method: "POST",
          headers,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.detail || data?.error || "Failed to load tenants");
        }

        setTenants(data?.tenants ?? []);
        setGeneratedAt(data?.generated_at ?? null);
        if (!authToken) {
          setAuthToken(basicHeader);
        }
      } catch (err: any) {
        if (!silent) {
          const message = err?.message ?? "Unable to load admin overview";
          setError(message);
          toast({ title: "Failed to load data", description: message, variant: "destructive" });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authToken, basicHeader, toast],
  );

  useEffect(() => {
    if (!basicHeader || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchTenants({ silent: true });
    }, 60_000);

    return () => clearInterval(interval);
  }, [basicHeader, autoRefresh, fetchTenants]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthToken(null);
    await fetchTenants();
  };

  const callAction = useCallback(
    async (action: "impersonate" | "reset-usage", payload: Record<string, any>) => {
      if (!basicHeader) return;

      setLoading(true);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicHeader}`,
        };
        if (SUPABASE_ANON_KEY) {
          headers.apikey = SUPABASE_ANON_KEY;
        }

        const res = await fetch(API_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ action, payload }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.detail || data?.error || `Action ${action} failed`);
        }

        if (action === "impersonate") {
          const link = data?.action_link as string | undefined;
          if (link) {
            window.open(link, "_blank", "noopener,noreferrer");
          }
          toast({
            title: "Impersonation link generated",
            description: link ? "Opened in a new tab." : "No link returned.",
          });
        } else if (action === "reset-usage") {
          toast({ title: "Usage reset", description: "Monthly usage counters reset for tenant." });
          await fetchTenants({ silent: true });
        }
      } catch (err: any) {
        toast({ title: "Action failed", description: err?.message ?? "Unable to perform action", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [basicHeader, fetchTenants, toast],
  );

  const summary = useMemo(() => {
    const total = tenants.length;
    const byPlan = tenants.reduce<Record<string, number>>((acc, tenant) => {
      acc[tenant.plan_id] = (acc[tenant.plan_id] ?? 0) + 1;
      return acc;
    }, {});
    const flagged = tenants.filter((tenant) => (tenant.alerts ?? []).length > 0).length;
    const activeBookings = tenants.reduce((acc, tenant) => acc + (tenant.usage?.bookings_current_month ?? 0), 0);
    return { total, byPlan, flagged, activeBookings };
  }, [tenants]);

  const lastRefreshedLabel = generatedAt
    ? formatDistanceToNow(new Date(generatedAt), { addSuffix: true })
    : "—";

  const authenticated = !!authToken || (!loading && tenants.length > 0 && error === null);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-xl border bg-card/70 p-6 shadow-sm backdrop-blur-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wide">Internal Use Only</span>
              </div>
              <h1 className="text-3xl font-bold">Whop Admin Console</h1>
              <p className="text-muted-foreground">
                Monitor tenant health, usage, and quickly impersonate or reset accounts.
              </p>
            </div>
            {authenticated && (
              <div className="flex flex-col items-end gap-2 text-right">
                <span className="text-xs uppercase text-muted-foreground">Last refreshed</span>
                <span className="text-sm font-medium">{lastRefreshedLabel}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={autoRefresh ? "default" : "outline"}
                    onClick={() => setAutoRefresh((prev) => !prev)}
                  >
                    <Repeat2 className="mr-2 h-4 w-4" />
                    {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fetchTenants() } disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">Refresh</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </header>

        {!authenticated ? (
          <Card className="max-w-xl border-primary/30">
            <CardHeader>
              <CardTitle>Admin credentials required</CardTitle>
              <CardDescription>
                Enter the shared Whop admin username and password to access the management dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="admin-username">Username</Label>
                  <Input
                    id="admin-username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="Enter admin username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter admin password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading || !username || !password}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Authenticate
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active tenants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <p className="text-xs text-muted-foreground">Across all plans</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly bookings</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.activeBookings}</div>
                  <p className="text-xs text-muted-foreground">Bookings scheduled this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Flagged tenants</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.flagged}</div>
                  <p className="text-xs text-muted-foreground">Tenants with active alerts</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Plan distribution</CardTitle>
                  <PlugZap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(summary.byPlan).map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{plan}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                  {Object.keys(summary.byPlan).length === 0 && (
                    <p className="text-sm text-muted-foreground">No tenants yet.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tenants.map((tenant) => {
                const totals = tenant.usage?.tenant_totals;
                const owner = tenant.owner;
                const lastActivity = tenant.latest_activity
                  ? formatDistanceToNow(new Date(tenant.latest_activity), { addSuffix: true })
                  : "No activity";

                return (
                  <Card key={tenant.company_id} className="border-border/70">
                    <CardHeader className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg font-semibold">{tenant.name}</CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline" className="capitalize">
                              {tenant.plan_id}
                            </Badge>
                            {tenant.whop_org_id && (
                              <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium">
                                {tenant.whop_org_id}
                              </span>
                            )}
                            {tenant.slug && (
                              <span className="text-muted-foreground">/{tenant.slug}</span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => callAction("impersonate", { user_id: owner?.user_id })}
                            disabled={!owner?.user_id || loading}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Impersonate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => callAction("reset-usage", { tenant_id: owner?.user_id })}
                            disabled={!owner?.user_id || loading}
                          >
                            Reset usage
                          </Button>
                        </div>
                      </div>
                      {tenant.alerts.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tenant.alerts.map((alert, idx) => (
                            <Badge key={idx} variant="destructive" className="text-xs">
                              {alert}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Active events</p>
                          <p className="text-lg font-semibold">{tenant.usage?.events ?? 0}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Bookings (month)</p>
                          <p className="text-lg font-semibold">{tenant.usage?.bookings_current_month ?? 0}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Forms</p>
                          <p className="text-lg font-semibold">{tenant.usage?.forms ?? 0}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Revenue total</p>
                          <p className="text-lg font-semibold">
                            {totals ? `${totals.revenue_currency ?? "GBP"} ${Number(totals.revenue_total ?? 0).toLocaleString()}` : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <UserCircle className="h-4 w-4" />
                          Owner contact
                        </div>
                        {owner ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{owner.company_name ?? "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{owner.login_email ?? owner.email ?? "No email"}</p>
                            <p className="text-xs text-muted-foreground">
                              Last sign in: {owner.last_sign_in_at ? formatDistanceToNow(new Date(owner.last_sign_in_at), { addSuffix: true }) : "Never"}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No owner recorded.</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent activity</p>
                        <p className="text-sm font-medium">{lastActivity}</p>
                        {tenant.recent_errors.length > 0 && (
                          <div className="space-y-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-xs">
                            <p className="font-semibold text-destructive-foreground">Recent errors</p>
                            <ul className="space-y-1">
                              {tenant.recent_errors.map((err, idx) => (
                                <li key={`${tenant.company_id}-err-${idx}`}>
                                  <span className="font-medium">{err.event}</span>
                                  <span className="ml-2 text-muted-foreground">
                                    {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
