import React from 'react';
import FeaturePageLayout from '@/components/FeaturePageLayout';

const SmartReorderingPage = () => {
  const benefits = [
    "AI-powered inventory suggestions",
    "Optimize working capital allocation",
    "Prevent costly stockouts of popular items",
    "Intelligent demand forecasting",
    "Cost optimization across categories"
  ];

  const howItWorks = [
    { title: "Data Collection", desc: "The system continuously analyzes your daily sales velocity and inventory patterns." },
    { title: "Identify Trends", desc: "AI algorithms detect seasonal trends and identify fast-moving vs. dead stock." },
    { title: "Generate Alerts", desc: "Receive proactive suggestions on what to order, when, and in what quantities." },
    { title: "One-Click Orders", desc: "Convert smart suggestions into actual purchase orders to your suppliers instantly." }
  ];

  const features = [
    { title: "Dead Stock Identification", desc: "Highlight products that are tying up capital without moving, prompting discount strategies." },
    { title: "Supplier Lead Times", desc: "Factor in how long suppliers take to deliver to ensure you order just in time." },
    { title: "Dynamic Thresholds", desc: "Instead of static minimums, thresholds adapt based on recent sales momentum." },
    { title: "Profitability Analysis", desc: "Prioritize reordering high-margin items to maximize overall store profitability." }
  ];

  return (
    <FeaturePageLayout
      title="AI-Powered Smart Re-ordering"
      description="Stop guessing what to buy. Intelligent inventory refill suggestions powered by AI to maximize sales and minimize dead stock."
      heroImage="https://images.unsplash.com/photo-1689942010216-dc412bb1e7a9?q=80&w=2000"
      inlineImage="https://images.unsplash.com/photo-1516383274235-5f42d6c6426d"
      inlineImageAlt="AI analytics data visualization inventory optimization"
      benefits={benefits}
      howItWorks={howItWorks}
      features={features}
      ctaText="Optimize Reordering"
    />
  );
};

export default SmartReorderingPage;