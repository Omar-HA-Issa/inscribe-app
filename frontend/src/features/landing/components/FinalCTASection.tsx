import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/shared/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const FinalCTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  return (
    <section ref={ref} className="py-32 px-8 md:px-16 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-blue/10" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-light mb-6"
        >
          Ready to align your{" "}
          <span className="bg-gradient-to-r from-brand-purple to-brand-blue bg-clip-text text-transparent font-medium">
            documentation
          </span>
          ?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          Join the beta and experience how Inscribe transforms scattered documentation into actionable insights.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => navigate("/signup")}
            size="lg"
            className="bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 text-white font-medium px-10 py-6 text-lg group"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/login")}
            className="font-medium px-10 py-6 text-lg border-border"
          >
            Sign In
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-sm text-muted-foreground mt-6"
        >
          No credit card required • Free during beta
        </motion.p>
      </div>
    </section>
  );
};
