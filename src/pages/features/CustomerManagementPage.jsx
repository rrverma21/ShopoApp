import React from 'react';
import FeaturePageLayout from '@/components/FeaturePageLayout';

const CustomerManagementPage = () => {
  const benefits = [
    "Track credit and Khata seamlessly",
    "Send automated payment reminders",
    "Build loyalty with point programs",
    "Complete customer purchase history",
    "Integrated SMS and WhatsApp communication tools"
  ];

  const howItWorks = [
    { title: "Create Profiles", desc: "Add customers easily using just their name and phone number during checkout." },
    { title: "Track Activity", desc: "Automatically log every purchase, visit, and preference to their profile." },
    { title: "Reward Loyalty", desc: "Assign points for purchases that customers can redeem on future visits." },
    { title: "Engage Directly", desc: "Send personalized offers and updates directly to their preferred channel." }
  ];

  const features = [
    { title: "Customer Segmentation", desc: "Group customers based on spending habits, frequency, or demographics." },
    { title: "Secure Passkeys", desc: "Provide customers with a secure 4-digit PIN to access their own purchase history." },
    { title: "Feedback Collection", desc: "Automatically request and manage reviews after a successful transaction." },
    { title: "Import/Export", desc: "Easily migrate your existing customer list using our bulk import tools." }
  ];

  return (
    <FeaturePageLayout
      title="Digital Customer Management"
      description="Maintain a digital Khata for your customers with complete transparency. Build stronger relationships and lasting loyalty."
      heroImage="https://images.unsplash.com/photo-1647964185937-1c0456bb8f76?q=80&w=2000"
      inlineImage="https://images.unsplash.com/photo-1599326014852-e083419b6f65"
      inlineImageAlt="Customer service representative with CRM dashboard"
      benefits={benefits}
      howItWorks={howItWorks}
      features={features}
      ctaText="Manage Customers Better"
    />
  );
};

export default CustomerManagementPage;