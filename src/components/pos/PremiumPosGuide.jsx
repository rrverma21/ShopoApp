import React, { useEffect, useState } from 'react';
import ReactJoyride, { STATUS } from 'react-joyride';
import { useTheme } from '@/contexts/ThemeContext';

const PremiumPosGuide = ({ run, setRun }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const steps = [
    {
      target: '[data-tour="home"]',
      content: 'Get a quick overview of your business stats, recent activities, and pending actions.',
      title: 'Dashboard Home',
      disableBeacon: true,
    },
    {
      target: '[data-tour="pos"]',
      content: 'Your main Point of Sale terminal. Process sales, scan barcodes, and handle payments quickly.',
      title: 'POS Terminal',
    },
    {
      target: '[data-tour="products"]',
      content: 'Manage your entire product catalog here. Add items, update stock, and set pricing tiers.',
      title: 'Product Catalog',
    },
    {
      target: '[data-tour="orders"]',
      content: 'Track and manage all your customer orders, including pending, completed, and cancelled ones.',
      title: 'Order Management',
    },
    {
      target: '[data-tour="settings"]',
      content: 'Configure your store profile, invoices, taxes, printers, and system preferences.',
      title: 'Store Settings',
    },
    {
      target: '[data-tour="customers"]',
      content: 'Maintain your customer database. View profiles, purchase history, and manage loyalty points.',
      title: 'Customer Database',
    },
    {
      target: '[data-tour="reports"]',
      content: 'Gain insights with detailed business reports on sales, revenue, and product performance.',
      title: 'Business Reports',
    },
    {
      target: '[data-tour="credit"]',
      content: 'Manage customer credit lines, track outstanding balances, and record payments.',
      title: 'Credit Management',
    },
    {
      target: '[data-tour="employees"]',
      content: 'Manage staff profiles, track attendance via QR code, and assign access roles.',
      title: 'Staff Management',
    },
    {
      target: '[data-tour="smart-reorder"]',
      content: 'Intelligent tool that suggests restocking based on low inventory and sales velocity.',
      title: 'Smart Reorder',
    },
    {
      target: '[data-tour="refunds"]',
      content: 'Process product returns and manage refund transactions efficiently.',
      title: 'Returns & Refunds',
    }
  ];

  useEffect(() => {
    if (run) {
      window.scrollTo(0, 0);
    }
  }, [run]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      localStorage.setItem('posGuideSeen', 'true');
    }
  };

  return (
    <ReactJoyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep={true}
      scrollOffset={100}
      disableOverlayClose={true}
      spotlightClicks={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#3b82f6', 
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          arrowColor: isDark ? '#1e293b' : '#ffffff',
          textColor: isDark ? '#f8fafc' : '#0f172a',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
        },
        tooltip: {
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          padding: '20px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: '700',
          marginBottom: '10px',
          color: isDark ? '#f8fafc' : '#0f172a',
        },
        tooltipContent: {
          fontSize: '15px',
          lineHeight: '1.5',
          marginBottom: '20px',
          color: isDark ? '#cbd5e1' : '#475569',
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          border: 'none',
          outline: 'none',
          boxShadow: '0 4px 6px -1px rgb(59 130 246 / 0.5)',
          transition: 'all 0.2s ease',
        },
        buttonBack: {
          color: isDark ? '#94a3b8' : '#64748b',
          marginRight: '10px',
          fontSize: '14px',
          fontWeight: '500',
        },
        buttonSkip: {
          color: isDark ? '#94a3b8' : '#64748b',
          fontSize: '14px',
          fontWeight: '500',
        },
      }}
      locale={{
        last: 'Get Started',
        skip: 'Skip Tour',
      }}
    />
  );
};

export default PremiumPosGuide;