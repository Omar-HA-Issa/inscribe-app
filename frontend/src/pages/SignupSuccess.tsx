import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignupSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(7);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-12 py-12 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
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
            Account Created!
          </h1>
          <p className="text-muted-foreground text-lg">
            Your DocuMind account has been successfully created.
          </p>
        </div>

        {/* Email Confirmation Notice */}
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
            <h2 className="text-lg font-medium text-foreground">
              Check Your Email
            </h2>
            <p className="text-sm text-muted-foreground">
              We've sent a confirmation email to your inbox. Please verify your
              email address to complete the registration process.
            </p>
          </div>
        </motion.div>

        {/* Redirect Message */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Redirecting to login in{" "}
            <span className="text-foreground font-semibold">{countdown}</span>{" "}
            seconds...
          </p>

          <Button
            onClick={() => navigate("/login")}
            className="w-full h-12 bg-foreground/10 hover:bg-foreground/20 text-foreground border-0 transition-all hover:shadow-glow"
          >
            Go to Login Now
          </Button>
        </div>
      </motion.div>
    </div>
  );
}