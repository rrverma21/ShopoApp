import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, CreditCard, Store, Truck, Droplet, Crown, Receipt } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

import GeneralSettings from '@/components/pos/GeneralSettings';
import StorefrontSettings from '@/components/pos/StorefrontSettings';
import DeliverySettings from '@/components/pos/DeliverySettings';
import WaterSettingsSection from '@/components/pos/WaterSettingsSection';
import DiorSettings from '@/components/retailer/DiorSettings';
import MembershipSettings from '@/components/pos/MembershipSettings';
import ReceiptConfigurationTab from '@/components/pos/ReceiptConfigurationTab';

const PosSettings = () => {
  const tabs = [
    { 
      id: "general", 
      label: "General", 
      icon: Settings, 
      component: <GeneralSettings />,
      colorClass: "data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white"
    },
    { 
      id: "receipt", 
      label: "Receipt & Invoice", 
      icon: Receipt, 
      component: <ReceiptConfigurationTab />,
      colorClass: "data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white"
    },
    { 
      id: "payment", 
      label: "Payment", 
      icon: CreditCard, 
      component: <DiorSettings />,
      colorClass: "data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white"
    },
    { 
      id: "storefront", 
      label: "Storefront", 
      icon: Store, 
      component: <StorefrontSettings />,
      colorClass: "data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white"
    },
    { 
      id: "delivery", 
      label: "Delivery", 
      icon: Truck, 
      component: <DeliverySettings />,
      colorClass: "data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white"
    },
    { 
      id: "water", 
      label: "Water", 
      icon: Droplet, 
      component: <WaterSettingsSection />,
      colorClass: "data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
    },
    { 
      id: "membership", 
      label: "Membership", 
      icon: Crown, 
      component: <MembershipSettings />,
      colorClass: "data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-24">
      <Helmet>
        <title>Settings - POS Dashboard</title>
      </Helmet>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">POS Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your Point of Sale configurations, storefront details, and delivery options.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur py-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:bg-transparent transition-all">
            <div className="overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                <TabsList className="flex w-max sm:w-full sm:grid sm:grid-cols-7 h-auto p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl min-w-[700px] sm:min-w-0">
                    {tabs.map((tab) => (
                      <TabsTrigger 
                        key={tab.id}
                        value={tab.id} 
                        className={`gap-2 px-3 py-2.5 rounded-lg data-[state=active]:shadow-sm transition-all text-xs sm:text-sm whitespace-nowrap ${tab.colorClass}`}
                      >
                          <tab.icon className="w-4 h-4 shrink-0" /> {tab.label}
                      </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </div>

        <div className="min-h-[50vh]">
          {tabs.map((tab) => (
            <TabsContent 
              key={tab.id} 
              value={tab.id} 
              className="space-y-4 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {tab.component}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export default PosSettings;