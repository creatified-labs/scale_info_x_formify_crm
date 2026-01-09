import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: January 9, 2026</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              By accessing and using Formify CRM ("the Service"), you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree with any of these terms, you are
              prohibited from using this Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              Formify CRM is a customer relationship management and booking platform that helps businesses manage
              appointments, track revenue, and analyze performance. The Service is provided through the Whop
              platform and includes:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Booking and appointment management</li>
              <li>Calendar integration and synchronization</li>
              <li>Revenue tracking and analytics</li>
              <li>Customer communication tools</li>
              <li>Performance reporting and insights</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Registration</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-4">
            <p>
              To use the Service, you must:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Have a valid Whop account</li>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old</li>
              <li>Not use the Service for any illegal purposes</li>
            </ul>
            <p className="mt-4">
              You are responsible for all activities that occur under your account.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceptable Use</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Upload or transmit viruses or malicious code</li>
              <li>Spam, harass, or abuse other users</li>
              <li>Scrape or harvest data from the Service</li>
              <li>Reverse engineer or decompile the Service</li>
              <li>Resell or redistribute the Service without permission</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription and Payment</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Billing</h3>
              <p>
                Subscription fees are processed through Whop. By subscribing, you authorize Whop to charge your
                payment method on a recurring basis according to your selected plan.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Refunds</h3>
              <p>
                Refund policies are governed by Whop's terms and conditions. Contact Whop support for refund
                requests.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Plan Changes</h3>
              <p>
                You may upgrade or downgrade your plan at any time. Changes will take effect at the start of
                your next billing cycle.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent
              to our collection and use of your data as described in the Privacy Policy.
            </p>
            <p className="mt-4">
              You retain ownership of all data you input into the Service. You grant us a license to use this
              data solely to provide and improve the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Third-Party Integrations</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              The Service integrates with third-party services such as Google Calendar. Your use of these
              integrations is subject to the respective third-party's terms and privacy policies. We are not
              responsible for third-party services or their actions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              The Service, including its design, features, graphics, and code, is owned by us and protected by
              intellectual property laws. You may not copy, modify, distribute, or create derivative works based
              on the Service without our express written permission.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disclaimers and Limitations</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Service Availability</h3>
              <p>
                The Service is provided "as is" and "as available". We do not guarantee uninterrupted access or
                error-free operation. We reserve the right to modify or discontinue the Service at any time.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental,
                special, or consequential damages arising from your use of the Service.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">No Warranty</h3>
              <p>
                We make no warranties regarding the accuracy, reliability, or completeness of the Service or
                any content provided through it.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Termination</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              We reserve the right to suspend or terminate your account at any time for violations of these Terms
              or for any other reason at our sole discretion. Upon termination:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Your access to the Service will be revoked</li>
              <li>You may request an export of your data within 30 days</li>
              <li>We may delete your data after 90 days</li>
              <li>No refunds will be issued for prepaid subscription fees</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              You agree to indemnify and hold us harmless from any claims, losses, damages, or expenses
              (including legal fees) arising from your use of the Service, your violation of these Terms, or
              your violation of any rights of another party.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes
              by posting the updated Terms on this page and updating the "Last updated" date. Your continued use
              of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in
              which we operate, without regard to conflict of law provisions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispute Resolution</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              Any disputes arising from these Terms or your use of the Service shall be resolved through binding
              arbitration, except where prohibited by law.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> no-reply@formifycrm.com
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Severability</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be
              limited or eliminated to the minimum extent necessary so that these Terms remain in full force and
              effect.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
