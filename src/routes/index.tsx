import { createFileRoute } from "@tanstack/react-router";
import { MarketingNav } from "@/components/layout/marketing-nav";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { TrustStrip } from "@/components/landing/trust-strip";
import { FeaturesSection } from "@/components/landing/features-section";
import { UsecasesSection } from "@/components/landing/usecases-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import { getAppUrl } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tokolink — Storefront instan untuk UMKM" },
      {
        name: "description",
        content:
          "Bikin landing-page toko + katalog produk dengan checkout WhatsApp dalam 5 menit. Gratis & open-source.",
      },
      { property: "og:title", content: "Tokolink — Storefront instan untuk UMKM" },
      {
        property: "og:description",
        content: "Link-in-bio + micro-catalog + WhatsApp checkout. Open source.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getAppUrl() },
      { property: "og:image", content: `${getAppUrl()}/og-main.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${getAppUrl()}/og-main.png` },
      { name: "twitter:title", content: "Tokolink — Storefront instan untuk UMKM" },
      {
        name: "twitter:description",
        content: "Bikin landing-page toko + katalog produk dengan checkout WhatsApp dalam 5 menit.",
      },
    ],
    links: [{ rel: "canonical", href: getAppUrl() }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Tokolink",
          description:
            "Storefront instan untuk UMKM dengan integrasi link-in-bio dan checkout WhatsApp.",
          applicationCategory: "BusinessApplication",
          operatingSystem: "All",
          url: getAppUrl(),
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "IDR",
          },
        })}
      </script>
      <MarketingNav />
      <HeroSection />
      <TrustStrip />
      <FeaturesSection />
      <UsecasesSection />
      <HowItWorks />
      <FaqSection />
      <CtaBanner />
      <Footer />
    </div>
  );
}
