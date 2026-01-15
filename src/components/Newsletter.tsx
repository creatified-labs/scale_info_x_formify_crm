"use client";

import { useState } from "react";
import { MessageCircle, ShieldCheck, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Newsletter = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ message: string; tone: "success" | "info" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const { error } = await supabase
        .from("support_requests")
        .insert({
          email: email.trim().toLowerCase(),
          message: message.trim(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error("support-request", error);
        setStatus({ message: "Couldn't send your message right now. Please try again shortly.", tone: "error" });
        return;
      }

      setStatus({ message: "Thanks! We'll get back to you soon.", tone: "success" });
      setEmail("");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {isExpanded ? (
        <div className="w-full max-w-xl ring-1 ring-black/10 bg-white/80 dark:bg-neutral-900/80 rounded-2xl p-4 shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-neutral-900 dark:text-neutral-100 font-medium tracking-tight">
                Get Support
              </p>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                Need help? Send us a message.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Privacy-first
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="mt-3 space-y-2">
            <div className="relative">
              <Mail className="h-4 w-4 text-neutral-400 absolute left-3 top-3" />
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl ring-1 ring-black/10 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 outline-none bg-white dark:bg-neutral-800 placeholder:text-neutral-400"
              />
            </div>
            <Textarea
              placeholder="How can we help?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-xl ring-1 ring-black/10 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 outline-none bg-white dark:bg-neutral-800 placeholder:text-neutral-400 resize-none"
            />
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2.5 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              {submitting ? "Sending…" : "Send Message"}
            </Button>
            {status && (
              <p
                className={`mt-2 text-xs ${
                  status.tone === "success"
                    ? "text-emerald-600"
                    : status.tone === "info"
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              >
                {status.message}
              </p>
            )}
          </form>
        </div>
      ) : (
        <Button
          onClick={() => setIsExpanded(true)}
          className="rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-6 py-3 shadow-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all hover:scale-105 flex items-center gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium">Support</span>
        </Button>
      )}
    </div>
  );
};
