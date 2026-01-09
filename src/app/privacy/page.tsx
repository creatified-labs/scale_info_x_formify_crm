import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: January 9, 2026</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Introduction</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              This Privacy Policy describes how Formify CRM ("we", "us", or "our") collects, uses, and shares
              information when you use our application.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Account Information</h3>
              <p>
                When you create an account through Whop, we collect your name, email address, and company
                information provided by the Whop platform.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Usage Data</h3>
              <p>
                We collect information about how you use our application, including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Bookings and appointments you create</li>
                <li>Revenue entries and financial data you input</li>
                <li>Calendar events and availability settings</li>
                <li>Integration preferences and connected services</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Calendar Integration</h3>
              <p>
                When you connect Google Calendar, we access your calendar events to check availability and
                create booking events. We only access calendars you explicitly grant permission to.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our service</li>
              <li>To manage your bookings and appointments</li>
              <li>To sync with your calendar and prevent scheduling conflicts</li>
              <li>To send booking confirmations and reminders</li>
              <li>To generate analytics and reports about your business</li>
              <li>To improve and optimize our application</li>
              <li>To communicate with you about service updates</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Sharing and Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-4">
            <p>We share your information only in the following circumstances:</p>

            <div>
              <h3 className="font-semibold mb-2">Service Providers</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Supabase</strong> - Database and authentication services</li>
                <li><strong>Google</strong> - Calendar integration and authentication</li>
                <li><strong>Whop</strong> - Platform authentication and user management</li>
                <li><strong>Vercel</strong> - Application hosting</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Legal Requirements</h3>
              <p>
                We may disclose your information if required by law or in response to valid legal requests.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Security</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Encrypted data transmission (HTTPS/SSL)</li>
              <li>Secure database storage with row-level security</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication requirements</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Disconnect integrated services</li>
              <li>Close your account</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              We retain your information for as long as your account is active or as needed to provide services.
              If you close your account, we will delete your personal information within 90 days, except where
              required by law to retain it longer.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              We use cookies and similar technologies to maintain your session, remember your preferences, and
              analyze usage patterns. You can control cookies through your browser settings.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              Our service is not intended for users under 18 years of age. We do not knowingly collect personal
              information from children.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting
              the new policy on this page and updating the "Last updated" date.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> no-reply@formifycrm.com
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
