import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {AnimatePresence, motion} from "framer-motion";
import {Button} from "@/shared/ui/button.tsx";
import {Input} from "@/shared/ui/input.tsx";
import {Label} from "@/shared/ui/label.tsx";
import {ArrowLeft, CheckCircle, Mail} from "lucide-react";
import {useToast} from "@/shared/hooks/use-toast.ts";
import {resetPasswordRequest} from "@/shared/lib/apiClient.ts";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await resetPasswordRequest(email);

      setEmailSent(true);
      toast({
        title: "Email sent!",
        description: response.message || "Check your email for a password reset link",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Password reset request failed";

      toast({
        title: "Request failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-12 py-12 bg-background">
      <AnimatePresence mode="wait">
        {!emailSent ? (
          // Password Reset Form
          <motion.div
            key="reset-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md space-y-8"
          >
            {/* Back to login button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Button>

            {/* Logo and Header */}
            <div className="space-y-2">
              <h1
                className="text-3xl font-semibold tracking-tight text-foreground"
                style={{ textShadow: "0 0 12px rgba(211,211,211,0.4)" }}
              >
                Reset Password
              </h1>
              <p className="text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>

            {/* Reset Form */}
            <form onSubmit={handleResetPassword} className="space-y-6 mt-12">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 bg-background/50 border-border/50 focus:border-border transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-foreground/10 hover:bg-foreground/20 text-foreground border-0 transition-all hover:shadow-glow"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    Sending link...
                  </span>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            {/* Back to sign in link */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Remember your password? </span>
              <Link
                to="/login"
                className="text-foreground hover:text-foreground/80 font-medium transition-colors"
              >
                Sign in
              </Link>
            </div>
          </motion.div>
        ) : (
          // Success Message
          <motion.div
            key="success-message"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md text-center space-y-8"
          >
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" />
                <CheckCircle className="w-20 h-20 text-green-500 relative" />
              </div>
            </motion.div>

            {/* Success Message */}
            <div className="space-y-4">
              <h1
                className="text-3xl font-semibold tracking-tight text-foreground"
                style={{ textShadow: "0 0 12px rgba(211,211,211,0.4)" }}
              >
                Email Sent!
              </h1>
              <p className="text-muted-foreground text-lg">
                We've sent a password reset link to your email
              </p>
            </div>

            {/* Email Info Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-lg bg-background/30 border border-border/30 space-y-4"
            >
              <div className="flex justify-center">
                <Mail className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Check your inbox at
                </p>
                <p className="text-base font-medium text-foreground">
                  {email}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Click the link in the email to reset your password. If you don't see it, check your spam folder.
                </p>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate("/login")}
                className="w-full h-12 bg-foreground/10 hover:bg-foreground/20 text-foreground border-0 transition-all hover:shadow-glow"
              >
                Back to login
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEmailSent(false)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Try a different email
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}