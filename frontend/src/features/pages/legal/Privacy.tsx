import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/shared/components/Footer";

export default function Privacy() {
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
          <h1 className="text-4xl font-semibold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 14, 2026</p>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Inscribe ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered document analysis platform. Please read this policy carefully to understand our practices regarding your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong className="text-foreground">Account Information:</strong> Email address, password, and account preferences</li>
                <li><strong className="text-foreground">Documents:</strong> Technical documents you upload for analysis</li>
                <li><strong className="text-foreground">Communications:</strong> Messages you send to us, including support requests</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">2.2 Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong className="text-foreground">Usage Data:</strong> Information about how you use the Service, including features accessed and time spent</li>
                <li><strong className="text-foreground">Device Information:</strong> Browser type, operating system, and device identifiers</li>
                <li><strong className="text-foreground">Log Data:</strong> IP address, access times, and pages viewed</li>
                <li><strong className="text-foreground">Cookies:</strong> Small data files stored on your device to enhance functionality</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">2.3 AI Processing Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                When you use our AI-powered features, we process your documents using artificial intelligence and machine learning models. This includes the content of your uploaded documents, generated summaries, insights, and analysis results.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>To provide, maintain, and improve the Service</li>
                <li>To process and analyze your uploaded documents using AI</li>
                <li>To authenticate your account and provide secure access</li>
                <li>To send you service-related notifications and updates</li>
                <li>To respond to your inquiries and support requests</li>
                <li>To monitor and analyze usage patterns and trends</li>
                <li>To detect, prevent, and address technical issues and security vulnerabilities</li>
                <li>To comply with legal obligations and enforce our Terms of Service</li>
                <li>To improve our AI models and algorithms (using aggregated, anonymized data only)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Security</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">4.1 Data Storage</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Your account information is stored securely using Supabase authentication services with industry-standard password hashing. When you upload documents:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Documents are processed to extract text content</li>
                <li>The original file is not permanently stored</li>
                <li>Only the extracted text and AI-generated analysis are stored in our database</li>
                <li>All data is encrypted at rest using Supabase's built-in encryption</li>
                <li>Row Level Security (RLS) policies ensure you can ONLY access your own data</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">4.2 Security Measures</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We implement industry-standard security measures to protect your data, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong className="text-foreground">Encryption in transit:</strong> All data transfers use TLS/SSL encryption (HTTPS)</li>
                <li><strong className="text-foreground">Encryption at rest:</strong> All stored data is encrypted using AES-256 encryption</li>
                <li><strong className="text-foreground">Secure authentication:</strong> Passwords are hashed using bcrypt with salt</li>
                <li><strong className="text-foreground">Row Level Security (RLS):</strong> Database policies enforce strict data isolation - users cannot access other users' documents, even through direct database queries</li>
                <li><strong className="text-foreground">Access controls:</strong> All API endpoints require authentication</li>
                <li><strong className="text-foreground">Rate limiting:</strong> Upload limits and request throttling prevent abuse</li>
                <li><strong className="text-foreground">Security updates:</strong> Infrastructure is regularly updated with security patches</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">4.3 AI Processing</h3>
              <p className="text-muted-foreground leading-relaxed">
                To provide AI analysis features, your document content is processed by our servers and third-party AI services in a secure environment. While we implement strict security measures, this means your documents are not end-to-end encrypted (zero-knowledge encryption would prevent AI analysis). We never use your documents to train AI models without explicit consent.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">4.4 Security Disclaimer</h3>
              <p className="text-muted-foreground leading-relaxed">
                While we implement robust security measures, no method of transmission over the internet or electronic storage is 100% secure. We strive to protect your information using industry best practices, but we cannot guarantee absolute security. You acknowledge that you provide your information at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">5.1 Third-Party Service Providers</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may share your information with third-party service providers who perform services on our behalf, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong className="text-foreground">Authentication Services:</strong> Supabase for user authentication and account management</li>
                <li><strong className="text-foreground">AI/ML Services:</strong> Cloud-based AI services for document processing and analysis</li>
                <li><strong className="text-foreground">Cloud Infrastructure:</strong> Hosting and storage providers</li>
                <li><strong className="text-foreground">Analytics:</strong> Services to understand usage patterns (using anonymized data)</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                These service providers are bound by confidentiality obligations and are only permitted to use your information as necessary to provide their services.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">5.2 Legal Requirements</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may disclose your information if required by law, legal process, or governmental request, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">5.3 What We Don't Do</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>We do NOT sell your personal information to third parties</li>
                <li>We do NOT use your uploaded documents to train our AI models without explicit consent</li>
                <li>We do NOT share your documents with other users</li>
                <li>We do NOT use your data for marketing purposes without your consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You have the following rights regarding your information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong className="text-foreground">Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong className="text-foreground">Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong className="text-foreground">Data Portability:</strong> Request a copy of your data in a portable format</li>
                <li><strong className="text-foreground">Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong className="text-foreground">Objection:</strong> Object to certain processing of your information</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us at contact@inscribe.dev
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide the Service. When you delete your account, we will delete or anonymize your personal information and uploaded documents within 30 days, except where we are required to retain it for legal or regulatory purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Maintain your session and keep you logged in</li>
                <li>Remember your preferences and settings</li>
                <li>Analyze usage patterns and improve the Service</li>
                <li>Provide security features and prevent fraud</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You can control cookies through your browser settings, but disabling cookies may affect the functionality of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using the Service, you consent to the transfer of your information to these countries.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that we have collected information from a child under 13, we will delete it immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by updating the "Last updated" date at the top of this policy and, if appropriate, by sending you an email notification. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Email: contact@inscribe.dev
              </p>
            </section>

            <section className="mt-12 p-6 bg-muted/30 rounded-lg border border-border/30">
              <h2 className="text-xl font-semibold mb-3 text-foreground">Your Privacy Matters</h2>
              <p className="text-muted-foreground leading-relaxed">
                We are committed to transparency and protecting your privacy. If you have any questions or concerns about how we handle your data, please don't hesitate to reach out. We're here to help.
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
