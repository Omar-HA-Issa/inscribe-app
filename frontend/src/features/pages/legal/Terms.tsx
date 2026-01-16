import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/shared/components/Footer";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-semibold text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 14, 2026</p>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using Inscribe ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Inscribe is an AI-powered document analysis platform designed specifically for technical documentation related to software development, DevOps, and system architecture. The Service provides:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Automated document analysis and summarization</li>
                <li>Technical insights extraction</li>
                <li>Document validation and contradiction detection</li>
                <li>Visual data representation</li>
                <li>AI-powered chat for document queries</li>
                <li>Report generation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To use the Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Upload documents containing malicious code, viruses, or harmful content</li>
                <li>Use the Service to process documents you do not have the right to access or analyze</li>
                <li>Attempt to reverse engineer, decompile, or hack the Service</li>
                <li>Use the Service to violate any applicable laws or regulations</li>
                <li>Upload non-technical documents when the Service is designed for technical documentation</li>
                <li>Share your account credentials with others</li>
                <li>Use automated scripts or bots to abuse the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Document Upload and Processing</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When you upload documents to Inscribe:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>You retain all ownership rights to your documents</li>
                <li>You grant us a limited license to process, analyze, and store your documents for the purpose of providing the Service</li>
                <li>You represent that you have the right to upload and process the documents</li>
                <li>You understand that documents are processed using AI and machine learning technologies</li>
                <li>You acknowledge that the Service is designed for technical documents only</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. AI-Generated Content</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service uses artificial intelligence to analyze documents and generate insights, summaries, and reports. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You should review and verify all AI-generated content before relying on it for critical decisions. We make no warranties regarding the accuracy, completeness, or reliability of AI-generated content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service, including its original content, features, and functionality, is owned by Inscribe and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, Inscribe shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, secure, or error-free.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we implement reasonable security measures to protect your data, no method of transmission over the internet or electronic storage is 100% secure. You acknowledge that you provide your information at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by updating the "Last updated" date at the top of this page. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Inscribe operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms, please contact us at contact@inscribe.dev
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
