import HeroSection from "./hero-section";
import SecurityMonitoring from "./security-monitoring";
import Testimonials from "./testimonials";
import CallToAction from "./call-to-action";
import FAQs from "./faqs";
import Footer from "./footer";
import CustomClerkPricing from "@/components/custom-clerk-pricing";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <SecurityMonitoring />
      <section className="bg-muted/50 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 mx-auto max-w-2xl space-y-4 text-center">
              <h1 className="text-center text-4xl font-semibold lg:text-5xl">Pricing that Scales with You</h1>
              <p>Choose the plan that fits your security monitoring needs. From startups to enterprise applications.</p>
          </div>
          <CustomClerkPricing />
        </div>
      </section>
      <Testimonials />
      <CallToAction />
      <FAQs />
      <Footer />
    </div>
  );
}
