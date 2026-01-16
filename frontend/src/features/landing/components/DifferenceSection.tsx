import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Code2, Zap, Target } from "lucide-react";

const differences = [
  {
    icon: Code2,
    title: "Built for Engineers",
    description: "Understands APIs, architecture, CI/CD pipelines, configs, and system design docs.",
    gradient: "from-brand-purple to-brand-blue",
  },
  {
    icon: Zap,
    title: "Instant Technical Review",
    description: "Finds version drift, port conflicts, API mismatches, configuration inconsistencies, deployment contradictions.",
    gradient: "from-brand-blue to-brand-purple",
  },
  {
    icon: Target,
    title: "Actionable Outputs",
    description: "Generates fixes, risks, contradictions, system gaps, and architecture insights automatically.",
    gradient: "from-brand-purple to-brand-blue",
  },
];

export const DifferenceSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="difference" ref={ref} className="py-32 px-8 md:px-16 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-5xl font-light text-foreground text-center mb-20"
        >
          What Makes Inscribe Different
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {differences.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group text-center relative p-8 border border-border rounded-2xl hover:border-transparent transition-all duration-300 bg-background overflow-hidden"
              >
                {/* Gradient border on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
                <div className="absolute inset-[1px] bg-background rounded-2xl" />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon with gradient border */}
                  <div className="mb-6 flex justify-center">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} p-[2px]`}>
                      <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
                        <Icon className="w-6 h-6 text-brand-purple" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-medium text-foreground mb-4">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Subtle gradient glow on hover */}
                <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-300`} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
