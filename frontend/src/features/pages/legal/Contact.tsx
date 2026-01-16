import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, Mail, MessageSquare, FileText } from "lucide-react";
import { Footer } from "@/shared/components/Footer";

export default function Contact() {
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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-semibold text-foreground mb-4">Contact Us</h1>
          <p className="text-muted-foreground mb-12">
            Have questions or feedback? We'd love to hear from you.
          </p>

          {/* Contact Cards */}
          <div className="space-y-6 mb-12">
            {/* Email Support */}
            <div className="p-6 rounded-lg bg-card border border-border hover:border-border/80 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <Mail className="w-6 h-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Email Support</h3>
                  <p className="text-muted-foreground mb-3">
                    For general inquiries, support requests, or feedback
                  </p>
                  <a
                    href="mailto:contact@inscribe.dev"
                    className="text-foreground hover:text-foreground/80 font-medium transition-colors inline-flex items-center gap-2"
                  >
                    contact@inscribe.dev
                    <span className="text-xs text-muted-foreground">→</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Bug Reports */}
            <div className="p-6 rounded-lg bg-card border border-border hover:border-border/80 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <MessageSquare className="w-6 h-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Bug Reports</h3>
                  <p className="text-muted-foreground mb-3">
                    Found a bug or experiencing technical issues?
                  </p>
                  <a
                    href="mailto:contact@inscribe.dev?subject=Bug Report"
                    className="text-foreground hover:text-foreground/80 font-medium transition-colors inline-flex items-center gap-2"
                  >
                    Report an issue
                    <span className="text-xs text-muted-foreground">→</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Feature Requests */}
            <div className="p-6 rounded-lg bg-card border border-border hover:border-border/80 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <FileText className="w-6 h-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Feature Requests</h3>
                  <p className="text-muted-foreground mb-3">
                    Have an idea to improve Inscribe?
                  </p>
                  <a
                    href="mailto:contact@inscribe.dev?subject=Feature Request"
                    className="text-foreground hover:text-foreground/80 font-medium transition-colors inline-flex items-center gap-2"
                  >
                    Suggest a feature
                    <span className="text-xs text-muted-foreground">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="p-6 rounded-lg bg-muted/30 border border-border/30">
            <h2 className="text-xl font-semibold text-foreground mb-3">Response Time</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We typically respond to inquiries within 24-48 hours during business days. For urgent matters, please indicate "URGENT" in your subject line.
            </p>
            <p className="text-sm text-muted-foreground">
              Business Hours: Monday - Friday, 9:00 AM - 5:00 PM (your local time may vary)
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
