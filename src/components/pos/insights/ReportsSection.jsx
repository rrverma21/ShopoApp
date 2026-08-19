import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileBarChart, Users, PackageSearch, CreditCard, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils'; // Import formatCurrency

const ReportCard = ({ title, icon: Icon, link, value, isCurrency }) => (
  <Link to={link} className="block group">
    <Card className="hover:shadow-lg transition-all duration-300 border-slate-200 bg-white group-hover:border-blue-200">
      <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-3 rounded-full bg-slate-100 group-hover:bg-blue-50 transition-colors">
          <Icon className="w-8 h-8 text-slate-600 group-hover:text-blue-600 transition-colors" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
          {value !== undefined && (
            <p className="text-sm text-slate-700 font-medium">
              {isCurrency ? formatCurrency(value || 0) : value}
            </p>
          )}
          <div className="text-sm text-slate-500 flex items-center justify-center gap-1 group-hover:text-blue-500 transition-colors font-medium">
            View <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const ReportsSection = () => {
  // No currency values are currently displayed in the default ReportCard
  // But added props for future use if needed, consistent with MetricCard
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Reports</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportCard title="Sale Report" icon={FileBarChart} link="/pos/reports" />
        <ReportCard title="Customer Report" icon={Users} link="/pos/customers" />
        <ReportCard title="Inventory Reports" icon={PackageSearch} link="/pos/products" />
        <ReportCard title="Sundry Debtors" icon={CreditCard} link="/pos/pending-payments" />
      </div>
    </div>
  );
};

export default ReportsSection;