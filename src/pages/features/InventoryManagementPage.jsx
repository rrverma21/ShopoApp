import React from 'react';
import FeaturePageLayout from '@/components/FeaturePageLayout';

const InventoryManagementPage = () => {
  const benefits = [
    "Real-time stock tracking across all channels",
    "Automatic updates from B2B wholesale orders",
    "Customizable stock alerts and thresholds",
    "Low stock push notifications",
    "Multi-location and branch support"
  ];

  const howItWorks = [
    { title: "Import Products", desc: "Bulk upload your existing inventory via CSV or add products manually in seconds." },
    { title: "Set Thresholds", desc: "Define minimum stock levels for each product to trigger automatic reorder alerts." },
    { title: "Track Movement", desc: "Monitor stock deductions automatically as sales occur at the POS or online store." },
    { title: "Manage Batches", desc: "Track expiration dates and batch numbers for perishable goods." }
  ];

  const features = [
    { title: "Barcode Generation", desc: "Create and print custom barcodes for products without existing UPCs." },
    { title: "Stock Auditing", desc: "Perform physical stock counts and reconcile discrepancies easily." },
    { title: "Supplier Management", desc: "Link products to specific suppliers to streamline the purchase ordering process." },
    { title: "Variant Support", desc: "Manage products with multiple sizes, colors, or weights under a single master item." }
  ];

  return (
    <FeaturePageLayout
      title="Real-Time Inventory Management"
      description="Gain complete control over your stock. Track inventory levels in real-time across your physical store and digital shop."
      heroImage="https://images.unsplash.com/photo-1516383274235-5f42d6c6426d?q=80&w=2000"
      inlineImage="https://images.unsplash.com/photo-1689942010216-dc412bb1e7a9"
      inlineImageAlt="Warehouse storage facility with organized shelves"
      benefits={benefits}
      howItWorks={howItWorks}
      features={features}
      ctaText="Optimize Your Inventory"
    />
  );
};

export default InventoryManagementPage;