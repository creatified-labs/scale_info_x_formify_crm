"use client";

export const dynamic = 'force-dynamic';
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

type UE = { event: string; metadata: any; created_at: string };

export default function Events() {
  const [rows, setRows] = useState<UE[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const founderAllow = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_FOUNDER_EMAILS as string | undefined;
    if (!raw) return true; // no gate configured
    const emails = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const email = (user?.email || "").toLowerCase();
    return emails.includes(email);
  }, [user?.email]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("Not authenticated");

      const company_id = await getCompanyId({ allowFallback: false });
      if (!company_id) throw new Error("No company");

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error: qErr } = await (supabase as any)
        .from("usage_events")
        .select("event, metadata, created_at")
        .eq("company_id", company_id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (qErr) throw qErr;
      setRows((data || []) as UE[]);
    } catch (e: any) {
      setError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => {
    const viewsSet = new Set(["preview_banner_view", "locktile_view"]);
    const ctasSet = new Set(["preview_banner_cta_click", "locktile_cta_click"]);
    let views = 0;
    let ctas = 0;
    let trialsSolo = 0;
    let trialsPro = 0;
    const blocks: Record<string, number> = {};
    for (const r of rows) {
      if (viewsSet.has(r.event)) views++;
      if (ctasSet.has(r.event)) ctas++;
      if (r.event === "trial_started") {
        const p = r.metadata?.plan;
        if (p === "solo") trialsSolo++;
        if (p === "pro") trialsPro++;
      }
      if (r.event === "feature_blocked") {
        const f = r.metadata?.feature || "unknown";
        blocks[f] = (blocks[f] || 0) + 1;
      }
    }
    return { views, ctas, trialsSolo, trialsPro, blocks };
  }, [rows]);

  if (!founderAllow) {
    return (
      <div className="p-6 max-w-5xl">
        <h1 className="text-2xl font-semibold mb-2">Not found</h1>
        <p className="text-muted-foreground">This page is not available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Events (last 7 days)</h1>
            <p className="text-muted-foreground">Internal usage events for your company</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
        </div>

        {/* Headline metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Views</CardTitle></CardHeader>
            <CardContent className="text-3xl">{metrics.views}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">CTAs</CardTitle></CardHeader>
            <CardContent className="text-3xl">{metrics.ctas}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Trials</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm">Solo: {metrics.trialsSolo}</div>
              <div className="text-sm">Pro: {metrics.trialsPro}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Blocks</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(metrics.blocks).length === 0 ? (
                <div className="text-sm text-muted-foreground">None</div>
              ) : (
                <div className="space-y-1">
                  {Object.entries(metrics.blocks).map(([k, v]) => (
                    <div key={k} className="text-sm flex justify-between"><span>{k}</span><span>{v}</span></div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent events</CardTitle></CardHeader>
          <CardContent>
            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No events in the past 7 days.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.event}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {truncate(JSON.stringify(r.metadata ?? {}))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function truncate(s: string, n = 120) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
