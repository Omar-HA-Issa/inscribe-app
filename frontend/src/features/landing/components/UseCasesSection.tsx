import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Layers, FileCode, Shield, GitBranch, Box, Briefcase } from "lucide-react";

const useCases = [
  {
    icon: Layers,
    title: "Architecture Reviews",
    description: "Validate system design docs for completeness and consistency.",
    gradient: "from-brand-purple to-brand-blue",
  },
  {
    icon: FileCode,
    title: "API & Spec Consistency",
    description: "Ensure OpenAPI specs match implementation and documentation.",
    gradient: "from-brand-blue to-brand-purple",
  },
  {
    icon: Shield,
    title: "DevOps / SRE Audits",
    description: "Review runbooks, incident docs, and operational procedures.",
    gradient: "from-brand-purple to-brand-blue",
  },
  {
    icon: GitBranch,
    title: "CI/CD Validation",
    description: "Analyze pipeline configs for security and best practices.",
    gradient: "from-brand-blue to-brand-purple",
  },
  {
    icon: Box,
    title: "System Design Evaluation",
    description: "Assess design proposals for gaps and scalability issues.",
    gradient: "from-brand-purple to-brand-blue",
  },
  {
    icon: Briefcase,
    title: "Technical Due Diligence",
    description: "Deep-dive into technical docs during M&A or investments.",
    gradient: "from-brand-blue to-brand-purple",
  },
];

export const UseCasesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="use-cases" ref={ref} className="min-h-screen flex items-center justify-center px-8 md:px-16 py-32 border-t border-border">
      <div className="max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <p className="text-sm text-accent uppercase tracking-wider mb-4">Use Cases</p>
          <h2 className="text-5xl md:text-6xl font-light text-foreground mb-6">
            Built for engineering workflows
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="group relative p-6 border border-border rounded-lg hover:border-transparent transition-all duration-300 bg-background overflow-hidden"
              >
                {/* Gradient border on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg`} />
                <div className="absolute inset-[1px] bg-background rounded-lg" />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon with gradient background */}
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${useCase.gradient} p-[1px] mb-4`}>
                    <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
                      <Icon className="w-6 h-6 text-brand-purple" />
                    </div>
                  </div>

                  <h3 className="text-xl font-medium text-foreground mb-3">
                    {useCase.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {useCase.description}
                  </p>
                </div>

                {/* Subtle gradient glow on hover */}
                <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-300`} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
