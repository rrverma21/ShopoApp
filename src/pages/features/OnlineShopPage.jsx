import React from 'react';
import FeaturePageLayout from '@/components/FeaturePageLayout';

const OnlineShopPage = () => {
  const benefits = [
    "Quick setup with zero coding required",
    "Easy sharing via WhatsApp and social media",
    "Accept online orders 24/7",
    "Integrated digital payment gateways",
    "Real-time order tracking for customers"
  ];

  const howItWorks = [
    { title: "Activate Storefront", desc: "Turn on your digital shop with a single click from your dashboard." },
    { title: "Select Products", desc: "Choose which inventory items to display online with a simple toggle." },
    { title: "Share Your Link", desc: "Distribute your unique store URL or QR code to your local customer base." },
    { title: "Fulfill Orders", desc: "Receive instant notifications for new orders, pack them, and manage delivery." }
  ];

  const features = [
    { title: "Custom Branding", desc: "Personalize your storefront with your logo, brand colors, and banner images." },
    { title: "Delivery Management", desc: "Set delivery zones, minimum order values, and distance-based shipping charges." },
    { title: "Store Timing Rules", desc: "Automatically pause online ordering when your physical shop is closed." },
    { title: "SEO Optimized", desc: "Built-in search engine optimization to help local customers find you on Google." }
  ];

  return (
    <FeaturePageLayout
      title="Launch Your Digital Storefront"
      description="Create your own branded online shop to reach local customers. Expand your sales beyond the physical counter."
      heroImage="https://images.unsplash.com/photo-1542744095-291d1f67b221?q=80&w=2000"
      inlineImage="https://images.unsplash.com/photo-1692914274658-819221d41d6c"
      inlineImageAlt="E-commerce storefront online shopping interface"
      benefits={benefits}
      howItWorks={howItWorks}
      features={features}
      ctaText="Launch Your Store"
    />
  );
};

export default OnlineShopPage;