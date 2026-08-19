import React from 'react';
import FeaturePageLayout from '@/components/FeaturePageLayout';

const CreditManagementPage = () => {
  const benefits = [
    "Detailed bills for transparent accounting",
    "Secure digital credit records (Udhaar)",
    "Comprehensive financial tracking",
    "Automated SMS/WhatsApp payment reminders",
    "Customizable credit limits per customer"
  ];

  const howItWorks = [
    { title: "Issue Credit", desc: "Select 'Credit' as the payment method during a POS transaction for verified customers." },
    { title: "Track Balances", desc: "View total outstanding amounts and detailed ledgers in your unified dashboard." },
    { title: "Send Reminders", desc: "Trigger automated or manual payment reminders with a direct payment link." },
    { title: "Settle Accounts", desc: "Record partial or full repayments easily, instantly updating the customer's ledger." }
  ];

  const features = [
    { title: "Credit Limits", desc: "Prevent over-extension by setting maximum credit limits for individual buyers." },
    { title: "Transaction History", desc: "Access an immutable log of every credit issued and payment received." },
    { title: "Aging Reports", desc: "Identify overdue accounts quickly with 30, 60, and 90-day aging summaries." },
    { title: "Digital Signatures", desc: "Optionally collect digital signatures for high-value credit transactions." }
  ];

  return (
    <FeaturePageLayout
      title="Complete Credit Management"
      description="Manage customer credits with full transparency and control. Replace your paper Khata with a secure digital ledger."
      heroImage="https://images.unsplash.com/photo-1586282391127-20f3952f64f7?q=80&w=2000"
      inlineImage="https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b"
      inlineImageAlt="Financial dashboard credit tracking interface"
      benefits={benefits}
      howItWorks={howItWorks}
      features={features}
      ctaText="Secure Your Cashflow"
    />
  );
};

export default CreditManagementPage;