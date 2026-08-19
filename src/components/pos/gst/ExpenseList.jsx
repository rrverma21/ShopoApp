import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatExpenseDate, isValidDate, parseExpenseDate } from '@/utils/dateUtils';
import { 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  RefreshCw, 
  AlertCircle, 
  FileSpreadsheet,
  Edit,
  Trash2
} from 'lucide-react';
import ExpenseExport from './ExpenseExport';

const ExpenseList = ({ expenses, loading, error, onRetry, dateRange, stats, onEdit }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState({});

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleRow = (id, e) => {
    if(e) e.stopPropagation();
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedExpenses = useMemo(() => {
    let sortableItems = [...expenses];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'date' || sortConfig.key === 'payment_date') {
          const aDate = parseExpenseDate(aValue);
          const bDate = parseExpenseDate(bValue);
          aValue = aDate ? aDate.getTime() : 0;
          bValue = bDate ? bDate.getTime() : 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [expenses, sortConfig]);

  const formatCurrency = (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Failed to load expenses</h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4 text-center max-w-md">{error.message}</p>
          <Button onClick={onRetry} variant="outline" className="border-red-200 hover:bg-red-100 dark:hover:bg-red-900/40">
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-1 h-4 w-4 text-blue-500" /> : <ChevronDown className="ml-1 h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      <ExpenseExport expenses={sortedExpenses} dateRange={dateRange} stats={stats} />

      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('date')}>
                  <div className="flex items-center">Date <SortIcon columnKey="date" /></div>
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('expense_type')}>
                  <div className="flex items-center">Type <SortIcon columnKey="expense_type" /></div>
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('vendor_name')}>
                  <div className="flex items-center">Vendor / Desc <SortIcon columnKey="vendor_name" /></div>
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('category')}>
                  <div className="flex items-center">Category <SortIcon columnKey="category" /></div>
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort('total_amount')}>
                  <div className="flex items-center justify-end">Amount <SortIcon columnKey="total_amount" /></div>
                </th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-8 mx-auto" /></td>
                  </tr>
                ))
              ) : sortedExpenses.length > 0 ? (
                sortedExpenses.map((exp) => (
                  <React.Fragment key={exp.id}>
                    <tr 
                      className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${expandedRows[exp.id] ? 'bg-slate-50 dark:bg-slate-800/30' : ''}`}
                      onClick={() => toggleRow(exp.id)}
                    >
                      <td className="px-4 py-4">
                        {expandedRows[exp.id] ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {isValidDate(exp.date) ? formatExpenseDate(exp.date, 'dd MMM yy') : 'No date'}
                      </td>
                      <td className="px-4 py-4">
                         <Badge variant="outline" className={`font-normal ${exp.expense_type === 'Purchase Bill' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'}`}>
                           {exp.expense_type === 'Purchase Bill' ? 'Bill' : 'Custom'}
                         </Badge>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100">
                        <div className="truncate max-w-[180px]" title={exp.vendor_name !== 'N/A' ? exp.vendor_name : exp.description}>
                          {exp.vendor_name !== 'N/A' ? exp.vendor_name : exp.description || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        {exp.category}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(exp.total_amount)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge variant="default" className={
                          exp.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          exp.payment_status === 'Partial' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' : 
                          'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                        }>
                          {exp.payment_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {exp.expense_type === 'Custom Expense' ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400" onClick={(e) => { e.stopPropagation(); onEdit(exp); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {expandedRows[exp.id] && (
                      <tr className="bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
                        <td colSpan="8" className="p-0">
                          <div className="px-14 py-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Financial Breakdown</h4>
                                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                  <div className="flex justify-between"><span>Subtotal:</span> <span className="font-medium">{formatCurrency(exp.subtotal)}</span></div>
                                  <div className="flex justify-between"><span>GST Amount {exp.gst_rate ? `(${exp.gst_rate}%)` : ''}:</span> <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(exp.gst_amount)}</span></div>
                                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 mt-1"><span className="font-medium">Total:</span> <span className="font-bold">{formatCurrency(exp.total_amount)}</span></div>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Payment & Meta</h4>
                                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                  <div className="flex justify-between"><span>Method:</span> <span className="font-medium">{exp.payment_method}</span></div>
                                  {exp.payment_date && <div className="flex justify-between"><span>Payment Date:</span> <span className="font-medium">{isValidDate(exp.payment_date) ? formatExpenseDate(exp.payment_date, 'dd MMM yyyy') : 'No date'}</span></div>}
                                  <div className="flex justify-between"><span>Reference ID:</span> <span className="font-medium font-mono text-xs">{exp.bill_no}</span></div>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description / Notes</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                  {exp.description || exp.notes || 'No additional details provided.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                        <FileSpreadsheet className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">No expenses found</p>
                      <p>Try adjusting your filters or add a new expense.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ExpenseList;