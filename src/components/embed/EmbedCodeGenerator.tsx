"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EventType, InviteeQuestion, CallType } from "@/types/scheduling";

interface EmbedCodeGeneratorProps {
  eventType: EventType;
  productSlug?: string;
  livePreviewData?: {
    name?: string;
    description?: string;
    duration?: string;
    allowedCallTypes?: CallType[];
    defaultCallType?: CallType;
    phoneRequired?: boolean;
    inPersonLocation?: string;
    customLinkLabel?: string;
    customLinkUrl?: string;
    questions?: InviteeQuestion[];
  };
}

export const EmbedCodeGenerator = ({ eventType, productSlug, livePreviewData }: EmbedCodeGeneratorProps) => {
  const [selectedOption, setSelectedOption] = useState<"option1" | "option2" | "option3">("option1");
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedReact, setCopiedReact] = useState(false);
  const [copiedJs, setCopiedJs] = useState(false);
  const { toast } = useToast();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const productPath = productSlug || 'default';
  
  const previewUrl = useMemo(() => {
    const url = `${baseUrl}/embed/${productPath}/${eventType.slug}?type=${selectedOption}`;
    
    if (livePreviewData) {
      const params = new URLSearchParams();
      params.set('type', selectedOption);
      params.set('preview', 'true');
      
      if (livePreviewData.name) params.set('name', livePreviewData.name);
      if (livePreviewData.description) params.set('description', livePreviewData.description);
      if (livePreviewData.duration) params.set('duration', livePreviewData.duration);
      if (livePreviewData.questions) {
        params.set('questions', JSON.stringify(livePreviewData.questions));
      }
      
      return `${baseUrl}/embed/${productPath}/${eventType.slug}?${params.toString()}`;
    }
    
    return url;
  }, [baseUrl, productPath, eventType.slug, selectedOption, livePreviewData]);
  
  const embedUrl = useMemo(() => {
    return `${baseUrl}/embed/${productPath}/${eventType.slug}?type=${selectedOption}`;
  }, [baseUrl, productPath, eventType.slug, selectedOption]);

  const iframeCode = `<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`;

  const reactCode = `import React from 'react';

function BookingEmbed() {
  return (
    <iframe
      src="${embedUrl}"
      width="100%"
      height="800"
      frameBorder="0"
      style={{ border: 'none', borderRadius: '8px' }}
      title="Booking Form"
    />
  );
}

export default BookingEmbed;`;

  const scriptCode = `<div id="booking-embed-${eventType.slug}"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.width = '100%';
    iframe.height = '800';
    iframe.frameBorder = '0';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    document.getElementById('booking-embed-${eventType.slug}').appendChild(iframe);
  })();
</script>`;

  const copyToClipboard = async (text: string, type: 'html' | 'react' | 'js') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'html') {
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
      } else if (type === 'react') {
        setCopiedReact(true);
        setTimeout(() => setCopiedReact(false), 2000);
      } else {
        setCopiedJs(true);
        setTimeout(() => setCopiedJs(false), 2000);
      }
      toast({
        title: "Copied!",
        description: "Embed code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const openPreview = () => {
    window.open(embedUrl, '_blank');
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Embed Your Booking Form</h3>
          <p className="text-sm text-muted-foreground">
            Choose a design option and copy the embed code to add this booking form to your website.
          </p>
        </div>

        <div>
          <Label className="mb-3 block">Select Design Style</Label>
          <Tabs value={selectedOption} onValueChange={(v) => setSelectedOption(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="option1">Classic</TabsTrigger>
              <TabsTrigger value="option2">Wizard</TabsTrigger>
              <TabsTrigger value="option3">Progressive</TabsTrigger>
            </TabsList>
            
            <TabsContent value="option1" className="mt-4 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Classic Layout</h4>
                <p className="text-sm text-muted-foreground">
                  The same three-column design as your booking page. Shows form, calendar, and time slots side by side.
                </p>
              </div>
              <div className="rounded-lg border overflow-hidden bg-muted/30">
                <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                  <span className="text-sm font-medium">Live Preview</span>
                  <Button onClick={openPreview} variant="ghost" size="sm" className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3" />
                    Open in new tab
                  </Button>
                </div>
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  className="w-full h-[600px] border-0"
                  title="Embed Preview"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="option2" className="mt-4 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Wizard Flow</h4>
                <p className="text-sm text-muted-foreground">
                  An onboarding-style sequence where invitees answer questions first, then select their preferred time.
                </p>
              </div>
              <div className="rounded-lg border overflow-hidden bg-muted/30">
                <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                  <span className="text-sm font-medium">Live Preview</span>
                  <Button onClick={openPreview} variant="ghost" size="sm" className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3" />
                    Open in new tab
                  </Button>
                </div>
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  className="w-full h-[600px] border-0"
                  title="Embed Preview"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="option3" className="mt-4 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Progressive Reveal</h4>
                <p className="text-sm text-muted-foreground">
                  All questions are listed vertically. The calendar and time selection appears at the bottom after completing the form.
                </p>
              </div>
              <div className="rounded-lg border overflow-hidden bg-muted/30">
                <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                  <span className="text-sm font-medium">Live Preview</span>
                  <Button onClick={openPreview} variant="ghost" size="sm" className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3" />
                    Open in new tab
                  </Button>
                </div>
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  className="w-full h-[600px] border-0"
                  title="Embed Preview"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold mb-3">Choose Your Code Format</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the implementation method that works best for your website.
            </p>
          </div>

          <div className="space-y-4">
            {/* HTML (iframe) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">HTML (iframe)</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(iframeCode, 'html')}
                  className="flex items-center gap-2"
                >
                  {copiedHtml ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <pre className="text-xs overflow-x-auto">
                  <code>{iframeCode}</code>
                </pre>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Simple iframe embed. Works on any website - just paste into your HTML.
              </p>
            </div>

            {/* React Component */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">React Component</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(reactCode, 'react')}
                  className="flex items-center gap-2"
                >
                  {copiedReact ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <pre className="text-xs overflow-x-auto">
                  <code>{reactCode}</code>
                </pre>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                React component for Next.js, Create React App, or any React application.
              </p>
            </div>

            {/* JavaScript */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">JavaScript</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(scriptCode, 'js')}
                  className="flex items-center gap-2"
                >
                  {copiedJs ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <pre className="text-xs overflow-x-auto">
                  <code>{scriptCode}</code>
                </pre>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                JavaScript snippet that dynamically creates the iframe. Use for more control or dynamic loading.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4">
          <h4 className="font-medium text-sm mb-2">💡 Integration Tips</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Adjust the height attribute (default: 800px) to fit your page layout</li>
            <li>The embed is fully responsive and will adapt to mobile screens</li>
            <li>All bookings made through the embed are tracked in your dashboard</li>
            <li>The embed inherits your event type's theme settings (light/dark mode)</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
