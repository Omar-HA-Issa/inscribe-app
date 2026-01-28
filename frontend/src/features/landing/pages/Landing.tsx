import { LandingHeader } from "../components/LandingHeader";
import { LandingHero } from "../components/LandingHero";
import { StatsSection } from "../components/StatsSection";
import { DifferenceSection } from "../components/DifferenceSection";
import { FeaturesSection } from "../components/FeaturesSection";
import { DemoSection } from "../components/DemoSection";
import { HowItWorksSection } from "../components/HowItWorksSection";
import { UseCasesSection } from "../components/UseCasesSection";
import { TestimonialsSection } from "../components/TestimonialsSection";
import { PricingComingSoonSection } from "../components/PricingComingSoonSection";
import { FinalCTASection } from "../components/FinalCTASection";
import { Footer } from "@/shared/components/Footer";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      <LandingHeader />

      <LandingHero onGetStarted={() => navigate("/login")} />
      <StatsSection />
      <DifferenceSection />
      <FeaturesSection />
      <DemoSection />
      <HowItWorksSection />
      <UseCasesSection />
      <TestimonialsSection />
      <PricingComingSoonSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default Landing;
