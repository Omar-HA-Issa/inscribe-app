import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export const DemoSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="demo" ref={ref} className="py-32 px-8 md:px-16 border-t border-border">
      <div className="max-w-7xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-5xl font-light text-foreground mb-6"
        >
          See Inscribe in Action
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto"
        >
          Instant analysis. No prompting. Real engineering intelligence.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-5xl mx-auto aspect-video bg-gradient-to-br from-muted/30 to-muted/10 border border-border rounded-lg flex items-center justify-center overflow-hidden relative"
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 to-brand-blue/5" />

          {/* Demo placeholder */}
          <p className="relative z-10 text-muted-foreground">Demo content coming soon</p>

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-brand-purple/30 rounded-tl-lg" />
          <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-brand-blue/30 rounded-br-lg" />
        </motion.div>
      </div>
    </section>
  );
};
