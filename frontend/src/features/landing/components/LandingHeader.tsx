import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { useNavigate } from "react-router-dom";
import inscribeLogo from "@/features/landing/assets/inscribe-logo.ico";
import { useState } from "react";

export const LandingHeader = () => {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  const [lastScrollY, setLastScrollY] = useState(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const difference = latest - lastScrollY;
    if (Math.abs(difference) > 50) {
      setHidden(difference > 0 && latest > 100);
      setLastScrollY(latest);
    }
  });

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: hidden ? -100 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 px-8 py-6 bg-background/95 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={inscribeLogo} alt="Inscribe" className="w-9 h-9" />
          <span className="text-xl font-medium text-foreground tracking-tight">Inscribe</span>
        </div>

        <nav className="hidden md:flex items-center gap-10">
          {[
            { href: "difference", label: "Why Inscribe" },
            { href: "features", label: "Features" },
            { href: "how-it-works", label: "How It Works" },
            { href: "use-cases", label: "Use Cases" },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => {
                document.getElementById(item.href)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <Button
          onClick={() => navigate("/login")}
          className="bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 text-white font-medium"
        >
          Try for free
        </Button>
      </div>
    </motion.header>
  );
};
