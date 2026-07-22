import HeroSection from "./hero-section";
import SecurityMonitoring from "./security-monitoring";
import Testimonials from "./testimonials";
import CallToAction from "./call-to-action";
import FAQs from "./faqs";
import Footer from "./footer";
// modules:imports

export default function Home() {
  return (
    <div>
      <HeroSection />
      <SecurityMonitoring />
      {/* modules:sections */}
      <Testimonials />
      <CallToAction />
      <FAQs />
      <Footer />
    </div>
  );
}
