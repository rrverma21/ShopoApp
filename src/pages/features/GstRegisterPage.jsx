import React from 'react';
import FeaturePageLayout from '@/components/FeaturePageLayout';

const GstRegisterPage = () => {
  const benefits = [
    "Automated GST calculation on all sales",
    "Easy generation of B2B Tax Invoices",
    "Maintain complete digital Purchase Register",
    "Ready-to-export GSTR-1 and GSTR-2 reports",
    "HSN/SAC code management for precise compliance"
  ];

  const howItWorks = [
    { title: "Set Taxes", desc: "Assign accurate GST rates and HSN codes to your products once during setup." },
    { title: "Record Sales", desc: "Process daily transactions while the system automatically separates taxable value and tax amounts." },
    { title: "Log Purchases", desc: "Enter your B2B purchase bills to maintain an accurate input tax credit (ITC) ledger." },
    { title: "Export Reports", desc: "Download clean, formatted Excel reports to share directly with your CA or accountant." }
  ];

  const features = [
    { title: "B2B Billing", desc: "Capture customer GSTIN details and generate fully compliant B2B tax invoices instantly." },
    { title: "HSN Master", desc: "Maintain a centralized directory of HSN/SAC codes for quick application to categories." },
    { title: "Expense Tracking", desc: "Log indirect business expenses (like rent or utilities) with their associated GST for ITC." },
    { title: "Credit/Debit Notes", desc: "Handle sales returns and supplier returns with proper documentation for tax filing." }
  ];

  return (
    <FeaturePageLayout
      title="Simplified GST Compliance"
      description="Take the stress out of tax season. Automatically maintain your In-Out registers and generate filing-ready reports in seconds."
      heroImage="https://images.unsplash.com/photo-1554224154-22dec7ec8818?q=80&w=2000"
      inlineImage="https://images.unsplash.com/photo-1554224154-22dec7ec8818"
      inlineImageAlt="Compliance documentation accounting records"
      benefits={benefits}
      howItWorks={howItWorks}
      features={features}
      ctaText="Streamline Your Taxes"
    />
  );
};

export default GstRegisterPage;