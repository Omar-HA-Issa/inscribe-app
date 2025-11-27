import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import {Button} from "@/shared/ui/button.tsx";
import {Input} from "@/shared/ui/input.tsx";
import {Label} from "@/shared/ui/label.tsx";
import {ArrowLeft, Check, X} from "lucide-react";
import {useToast} from "@/shared/hooks/use-toast.ts";
import {useAuth} from "@/features/auth/context/AuthContext.tsx";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signup } = useAuth();

  // Password validation requirements
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    passwordsMatch: password === confirmPassword && confirmPassword.length > 0,
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      toast({
        title: "Password requirements not met",
        description: "Please ensure all password requirements are satisfied",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password);

      // Redirect to signup success page (no toast needed, the page shows the message)
      navigate("/signup-success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Signup failed";

      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-12 py-12 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
            style={{ textShadow: '0 0 12px rgba(211,211,211,0.4)' }}
          >
            Inscribe
          </h1>
          <p className="text-muted-foreground">Create your account to get started</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-6 mt-12">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-muted-foreground"
            >
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

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-muted-foreground"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 bg-background/50 border-border/50 focus:border-border transition-all"
              placeholder="Create a strong password"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-muted-foreground"
            >
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 bg-background/50 border-border/50 focus:border-border transition-all"
              placeholder="Confirm your password"
            />
          </div>

          {/* Password Requirements */}
          {password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 p-4 rounded-lg bg-background/30 border border-border/30"
            >
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Password Requirements:
              </p>

              <RequirementItem
                met={passwordRequirements.minLength}
                text="At least 8 characters"
              />
              <RequirementItem
                met={passwordRequirements.hasUppercase}
                text="One uppercase letter"
              />
              <RequirementItem
                met={passwordRequirements.hasLowercase}
                text="One lowercase letter"
              />
              <RequirementItem
                met={passwordRequirements.hasNumber}
                text="One number"
              />
              <RequirementItem
                met={passwordRequirements.hasSpecial}
                text="One special character (!@#$%^&*)"
              />
              {confirmPassword.length > 0 && (
                <RequirementItem
                  met={passwordRequirements.passwordsMatch}
                  text="Passwords match"
                />
              )}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !allRequirementsMet}
            className="w-full h-12 bg-foreground/10 hover:bg-foreground/20 text-foreground border-0 transition-all hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        {/* Sign in link */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link
            to="/login"
            className="text-foreground hover:text-foreground/80 font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// Password Requirement Item Component
function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 text-sm"
    >
      {met ? (
        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
      )}
      <span className={met ? "text-foreground" : "text-muted-foreground"}>
        {text}
      </span>
    </motion.div>
  );
}