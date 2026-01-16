import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Upload, Zap, Search, FileDown } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload",
    description: "Upload technical docs (PDF, TXT, MD)",
  },
  {
    icon: Zap,
    title: "Auto-Analysis",
    description: "Inscribe auto-analyzes immediately",
  },
  {
    icon: Search,
    title: "Explore",
    description: "Explore contradictions, risks, architecture warnings",
  },
  {
    icon: FileDown,
    title: "Export",
    description: "Export an engineering-grade report",
  },
];

export const HowItWorksSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} className="min-h-screen flex items-center justify-center px-8 md:px-16 py-32 border-t border-border">
      <div className="max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <p className="text-sm text-accent uppercase tracking-wider mb-4">How It Works</p>
          <h2 className="text-5xl md:text-6xl font-light text-foreground mb-6">
            Simple workflow
          </h2>
        </motion.div>

        {/* Steps with connecting line */}
        <div className="relative">
          {/* Gradient connecting line - desktop only */}
          <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-purple via-brand-blue to-brand-purple opacity-30" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: index * 0.15 }}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Icon circle with gradient border */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue p-[2px]">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                        <Icon className="w-8 h-8 text-brand-purple" />
                      </div>
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue opacity-20 blur-xl" />
                  </div>

                  <h3 className="text-2xl font-medium text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed max-w-[200px]">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
