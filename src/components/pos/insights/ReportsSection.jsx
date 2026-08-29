import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileBarChart, Users, PackageSearch, CreditCard, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';

const ReportCard = ({ title, icon: Icon, link, value, isCurrency }) => (
  <Link to={link} className="group block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
    <Card className="h-full min-h-[92px] rounded-[18px] border border-slate-200/80 bg-white shadow-none transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
      <CardContent className="flex h-full items-center gap-3 px-4 py-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {value !== undefined && (
            <p className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums text-slate-700">
              {isCurrency ? formatCurrency(value || 0) : value}
            </p>
          )}
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-400 transition-colors group-hover:text-blue-600">
            View report <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const ReportsSection = () => {
  return (
    <section aria-labelledby="reports-title" className="space-y-3">
      <div>
        <h2 id="reports-title" className="text-lg font-bold text-slate-900">Reports</h2>
        <p className="mt-1 text-xs text-slate-500">Open detailed views for key business records.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Sale Report" icon={FileBarChart} link="/pos/reports" />
        <ReportCard title="Customer Report" icon={Users} link="/pos/customers" />
        <ReportCard title="Inventory Reports" icon={PackageSearch} link="/pos/products" />
        <ReportCard title="Sundry Debtors" icon={CreditCard} link="/pos/pending-payments" />
      </div>
    </section>
  );
};

export default ReportsSection;
