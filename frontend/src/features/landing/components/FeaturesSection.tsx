import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, Network, Settings, FileCode, Eye, FileText } from "lucide-react";

const features = [
  {
    icon: AlertTriangle,
    title: "Contradiction Detection",
    description: "Version inconsistencies, port conflicts, API method mismatches, config drift.",
  },
  {
    icon: Network,
    title: "Architecture Review",
    description: "Detects missing components, unclear data flow, scalability issues.",
  },
  {
    icon: Settings,
    title: "Pipeline & Config Validation",
    description: "Analyzes CI/CD steps, Helm/Kustomize differences, unpinned images.",
  },
  {
    icon: FileCode,
    title: "API Spec Intelligence",
    description: "Compares OpenAPI, UI logic, and described behavior.",
  },
  {
    icon: Eye,
    title: "Hidden Insights",
    description: "Surfaces risks, anomalies, patterns across distributed systems.",
  },
  {
    icon: FileText,
    title: "Engineering Report Generation",
    description: "Clean export summarizing all issues and insights.",
  },
];

export const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" ref={ref} className="min-h-screen flex items-center justify-center px-8 md:px-16 py-32 border-t border-border">
      <div className="max-w-7xl mx-auto w-full">
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <p className="text-sm text-accent uppercase tracking-wider mb-4">Features</p>
          <h2 className="text-5xl md:text-6xl font-light text-foreground mb-6">
            Engineering-grade analysis
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.15 }}
                className="group"
              >
                {/* Icon with gradient border */}
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-purple to-brand-blue p-[1px]">
                    <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
                      <Icon className="w-6 h-6 text-brand-purple" />
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-medium text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
