import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const testimonials = [
  {
    role: "Senior Engineer",
    content: "Inscribe caught a version mismatch between our API spec and deployment config that would have caused a production incident.",
    avatar: "SE",
    gradient: "from-brand-purple to-brand-blue",
  },
  {
    role: "DevOps Lead",
    content: "The pipeline validation saved us hours of debugging. It identified an unpinned image that was causing intermittent build failures.",
    avatar: "DL",
    gradient: "from-brand-blue to-brand-purple",
  },
  {
    role: "Platform Architect",
    content: "Finally, a tool that understands technical documentation. The architecture review flagged three missing components in our design doc.",
    avatar: "PA",
    gradient: "from-brand-purple to-brand-blue",
  },
];

export const TestimonialsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-32 px-8 md:px-16 border-t border-border">
      <div className="max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-light text-foreground">
            What Engineers Are Saying
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.role}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group relative p-6 border border-border rounded-lg hover:border-transparent transition-all duration-300 bg-background overflow-hidden"
            >
              {/* Gradient border on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg`} />
              <div className="absolute inset-[1px] bg-background rounded-lg" />

              {/* Content */}
              <div className="relative z-10">
                <p className="text-muted-foreground leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} p-[1px]`}>
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                      <span className="text-sm font-medium text-brand-purple">
                        {testimonial.avatar}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {testimonial.role}
                  </div>
                </div>
              </div>

              {/* Subtle gradient glow on hover */}
              <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-300`} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
