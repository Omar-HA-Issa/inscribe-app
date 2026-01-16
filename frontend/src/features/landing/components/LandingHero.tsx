import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useState, useEffect } from "react";

interface LandingHeroProps {
  onGetStarted: () => void;
}

const phrases = [
  "decisions align.",
  "teams align.",
  "outcomes align.",
];

export const LandingHero = ({ onGetStarted }: LandingHeroProps) => {
  const [currentPhrase, setCurrentPhrase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToNext = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-8 md:px-16 relative pt-32">
      <div className="max-w-6xl relative z-10 text-center mb-16 px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-6xl lg:text-7xl font-light leading-tight mb-16"
        >
          <span className="text-muted-foreground">When documentation aligns, </span>
          <span className="relative inline-block" style={{ minWidth: '280px' }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={currentPhrase}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut"
                }}
                className="block font-medium text-foreground bg-gradient-to-r from-brand-purple to-brand-blue bg-clip-text text-transparent leading-normal"
              >
                {phrases[currentPhrase]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 text-white font-medium px-10 py-6 text-lg"
          >
            Start Free Beta
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            className="font-medium px-10 py-6 text-lg border-border"
          >
            Watch Demo
          </Button>
        </motion.div>
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        onClick={scrollToNext}
        className="absolute bottom-12 left-8 text-muted-foreground hover:text-foreground transition-colors"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </section>
  );
};
