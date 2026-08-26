import React from 'react';
import { ShieldCheck, Store, CreditCard, Lock, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TrustBadges = ({ className, layout = 'row', variant = 'default' }) => {
  const badges = [
    {
      icon: Building2,
      title: "Retail Business Tools",
      desc: "POS billing, inventory, customer management, and reporting in one platform.",
      color: "text-blue-600 bg-blue-50"
    },
    {
      icon: Store,
      title: "Digital Shop",
      desc: "Give local customers a convenient way to browse and order from your shop.",
      color: "text-green-600 bg-green-50"
    },
    {
      icon: CreditCard,
      title: "Subscription Payments",
      desc: "Online payments (Paytm/UPI) are ONLY for membership & POS software fees.",
      color: "text-purple-600 bg-purple-50"
    },
    {
      icon: ShieldCheck,
      title: "Secure Platform",
      desc: "Enterprise-grade security for your business data and digital transactions.",
      color: "text-slate-600 bg-slate-50"
    }
  ];

  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-wrap gap-3 text-xs text-slate-500", className)}>
        <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
          <Building2 className="w-3 h-3" /> Business Platform
        </span>
        <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
          <Store className="w-3 h-3" /> Digital Shop
        </span>
        <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
          <Lock className="w-3 h-3" /> Secure Data
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-4",
      layout === 'row' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1",
      className
    )}>
      {badges.map((badge, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
          <div className={cn("p-2 rounded-full shrink-0", badge.color)}>
            <badge.icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">{badge.title}</h4>
            <p className="text-xs text-slate-500 leading-snug mt-0.5">{badge.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrustBadges;
