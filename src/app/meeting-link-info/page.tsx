"use client";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MessageSquare, Phone, Video } from "lucide-react";


const MeetingLinkInfo = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/scheduling">
            <ArrowLeft className="w-4 h-4" />
            Back to bookings
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Meeting link will be sent by host</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              The meeting link hasn&apos;t been provided yet. Reach out to the host to confirm the call details.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-1 w-5 h-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Email the host</h3>
                  <p className="text-sm text-muted-foreground">
                    Send a quick email asking for the conference link or dial-in details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-1 w-5 h-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Call or text</h3>
                  <p className="text-sm text-muted-foreground">
                    If you have their phone number, give them a call or send a text to confirm the meeting information.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="mt-1 w-5 h-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Send a quick message</h3>
                  <p className="text-sm text-muted-foreground">
                    Use your usual chat channel (Slack, WhatsApp, etc.) to request the link.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Video className="mt-1 w-5 h-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Add the link once you have it</h3>
                  <p className="text-sm text-muted-foreground">
                    After receiving the details, edit the booking to include the URL so everyone stays informed.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MeetingLinkInfo;
