import { useNavigate } from "react-router-dom";

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="py-8 px-8 md:px-16 border-t border-border">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © 2025 Inscribe. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={() => navigate("/terms")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </button>
          <button
            onClick={() => navigate("/privacy")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </button>
        </div>
      </div>
    </footer>
  );
};
