import React from 'react';
import FeaturePageLayout from '@/components/FeaturePageLayout';

const PosBillingPage = () => {
  const benefits = [
    "Fast processing for quick checkouts",
    "Mobile, tablet, and desktop support",
    "Instant digital receipts via WhatsApp",
    "Direct thermal and laser invoice printing",
    "Real-time cloud synchronization"
  ];

  const howItWorks = [
    { title: "Scan or Search", desc: "Easily add items to the cart using a barcode scanner or intuitive search bar." },
    { title: "Apply Discounts", desc: "Instantly apply manual discounts or select active promotional offers." },
    { title: "Accept Payment", desc: "Process Cash, Card, UPI, or even split payments across multiple methods." },
    { title: "Generate Receipt", desc: "Print a professional thermal receipt or share a digital copy directly to WhatsApp." }
  ];

  const features = [
    { title: "Offline Mode", desc: "Keep billing even when the internet drops; syncs automatically when connection returns." },
    { title: "Customer Linkage", desc: "Attach sales to specific customer profiles for loyalty tracking and credit management." },
    { title: "Hold & Resume Sale", desc: "Put a transaction on hold to serve the next customer, and resume it later." },
    { title: "Refunds & Returns", desc: "Process full or partial returns seamlessly with automatic inventory updates." }
  ];

  return (
    <FeaturePageLayout
      title="Advanced POS Billing System"
      description="A lightning-fast, cloud-based Point of Sale system designed to handle high-volume retail transactions efficiently."
      heroImage="https://images.unsplash.com/photo-1634733988138-bf2c3a2a13fa?q=80&w=2000"
      inlineImage="https://images.unsplash.com/photo-1649424219328-a61c36cc7892"
      inlineImageAlt="Modern POS terminal checkout system"
      benefits={benefits}
      howItWorks={howItWorks}
      features={features}
      ctaText="Start Billing Now"
    />
  );
};

export default PosBillingPage;