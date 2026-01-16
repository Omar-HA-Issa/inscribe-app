import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Clock } from "lucide-react";

const pricingTiers = [
  {
    name: "Beta Access",
    price: "Free",
    description: "Full access to all engineering tools.",
    gradient: "from-brand-purple to-brand-blue",
    features: [
      "All 6 engineering-focused analysis tools",
      "Contradiction detection & architecture review",
      "Engineering report generation",
      "Rate limits applied",
    ],
    highlighted: true,
  },
  {
    name: "Professional",
    price: "Coming Soon",
    description: "For teams that need more power.",
    gradient: "from-brand-blue to-brand-purple",
    features: [
      "Everything in Beta Access",
      "Reduced rate limits",
      "Priority processing",
      "Team collaboration features",
    ],
    highlighted: false,
  },
];

export const PricingComingSoonSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-32 px-8 md:px-16 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-5xl font-light text-foreground text-center mb-20"
        >
          Pricing
        </motion.h2>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-8 border border-border rounded-lg hover:border-transparent transition-all duration-300 bg-background overflow-hidden"
            >
              {/* Gradient border on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg`} />
              <div className="absolute inset-[1px] bg-background rounded-lg" />

              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${tier.gradient} p-[1px] mb-4`}>
                    <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
                      {tier.highlighted ? (
                        <Check className="w-6 h-6 text-brand-purple" />
                      ) : (
                        <Clock className="w-6 h-6 text-brand-purple" />
                      )}
                    </div>
                  </div>
                  <h3 className="text-2xl font-medium text-foreground mb-2">
                    {tier.name}
                  </h3>
                  <p className={`text-3xl font-semibold bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent mb-2`}>
                    {tier.price}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {tier.description}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-brand-purple mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Subtle gradient glow on hover */}
              <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${tier.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-300`} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
