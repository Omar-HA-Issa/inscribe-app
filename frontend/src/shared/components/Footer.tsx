import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Github, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Footer = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  return (
    <footer ref={ref} className="py-16 px-8 md:px-16 border-t border-border">
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex flex-col md:flex-row justify-between gap-12">
          {/* Left side - Logo and Brand */}
          <div className="flex items-center gap-3">
            <img src="/favicon.ico" alt="Inscribe" className="w-10 h-10" />
            <span className="text-2xl font-medium text-foreground tracking-tight">Inscribe</span>
          </div>

          {/* Right side - Links and Social */}
          <div className="flex flex-col md:flex-row gap-12 md:gap-20">
            {/* Links Column */}
            <div className="flex flex-col gap-3 text-sm">
              <a href="mailto:contact@inscribe.dev" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
              <button onClick={() => navigate("/terms")} className="text-muted-foreground hover:text-foreground transition-colors text-left">
                Terms
              </button>
              <button onClick={() => navigate("/privacy")} className="text-muted-foreground hover:text-foreground transition-colors text-left">
                Privacy
              </button>
              <span className="text-muted-foreground mt-2">
                © 2026 Inscribe
              </span>
            </div>

            {/* Social Icons */}
            <div className="flex md:flex-col gap-4">
              <a href="https://github.com/Omar-HA-Issa/inscribe-app" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </footer>
  );
};