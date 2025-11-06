import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import Lottie from "lottie-react";
import {Button} from "@/shared/ui/button.tsx";
import {Input} from "@/shared/ui/input.tsx";
import {Label} from "@/shared/ui/label.tsx";
import {useToast} from "@/shared/hooks/use-toast.ts";
import {useAuth} from "@/features/auth/context/AuthContext.tsx";
import animationData from "@/shared/assets/animations/loading.json";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);

      toast({
        title: "Welcome back!",
        description: "Successfully logged in to your account",
      });

      // Redirect to dashboard or index
      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";

      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Login Form */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center px-12 py-12"
      >
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="space-y-2">
            <h1
              className="text-3xl font-semibold tracking-tight text-foreground"
              style={{ textShadow: '0 0 12px rgba(211,211,211,0.4)' }}
            >
              DocuMind
            </h1>
            <p className="text-muted-foreground">Sign in to continue your journey</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6 mt-12">
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
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 bg-background/50 border-border/50 focus:border-border transition-all"
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
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link
              to="/signup"
              className="text-foreground hover:text-foreground/80 font-medium transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Right Side - Lottie Animation */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="hidden lg:flex flex-1 items-center justify-center p-12 bg-background/30"
      >
        <div className="w-full max-w-xl">
          <Lottie
            animationData={animationData}
            loop={true}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
      </motion.div>
    </div>
  );
}