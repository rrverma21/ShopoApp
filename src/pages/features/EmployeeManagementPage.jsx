import React from 'react';
import FeaturePageLayout from '@/components/FeaturePageLayout';

const EmployeeManagementPage = () => {
  const benefits = [
    "QR-code based attendance tracking",
    "Performance and sales management",
    "Automated salary and payout tracking",
    "Strict role-based access control",
    "Shift and schedule management"
  ];

  const howItWorks = [
    { title: "Add Staff", desc: "Create profiles for your employees and assign them specific system roles (Cashier, Manager)." },
    { title: "Track Time", desc: "Employees scan a unique QR code to check in and out, logging their working hours." },
    { title: "Monitor Sales", desc: "Track which employee processed which transaction for accountability and commissions." },
    { title: "Process Payroll", desc: "Calculate salaries, manage advances, and generate digital payslips easily." }
  ];

  const features = [
    { title: "Leave Management", desc: "Track sick days, paid time off, and approve or deny leave requests digitally." },
    { title: "Access Restrictions", desc: "Prevent cashiers from viewing sensitive profit margins or altering inventory levels." },
    { title: "Performance Reviews", desc: "Log periodic ratings and feedback to monitor employee growth over time." },
    { title: "Staff PINs", desc: "Secure POS access with individual PIN codes for quick, accountable switching." }
  ];

  return (
    <FeaturePageLayout
      title="Advanced Staff Management"
      description="Manage your workforce efficiently. Role-wise access control, attendance tracking, and performance monitoring all in one place."
      heroImage="https://images.unsplash.com/photo-1686061594225-3e92c0cd51b0?q=80&w=2000"
      inlineImage="https://images.unsplash.com/photo-1531497258014-b5736f376b1b"
      inlineImageAlt="Team collaboration staff management workplace"
      benefits={benefits}
      howItWorks={howItWorks}
      features={features}
      ctaText="Manage Your Team"
    />
  );
};

export default EmployeeManagementPage;