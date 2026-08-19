import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Eye, ArrowUpDown, List } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ExpenseListTable = ({ expenses, loading, onEdit, onDelete, onViewDetails }) => {
  const [sortDirection, setSortDirection] = useState('desc');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedExpenses = [...expenses].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const toggleSort = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const summary = expenses.reduce((acc, exp) => {
    acc.totalAmount += parseFloat(exp.amount) || 0;
    acc.totalGST += parseFloat(exp.gst_amount) || 0;
    return acc;
  }, { totalAmount: 0, totalGST: 0 });

  const grandTotal = summary.totalAmount + summary.totalGST;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          Business Expenses List
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="font-semibold">Expense Type</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">
                  <Button variant="ghost" size="sm" onClick={toggleSort} className="h-8 px-2 -ml-2">
                    Date <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right font-semibold">Amount (₹)</TableHead>
                <TableHead className="text-right font-semibold">GST (₹)</TableHead>
                <TableHead className="text-right font-semibold">Total (₹)</TableHead>
                <TableHead className="font-semibold">Payment</TableHead>
                <TableHead className="text-center font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    <List className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                    <p className="text-base font-medium">No business expenses recorded yet.</p>
                    <p className="text-sm mt-1">Click "Add New Expense" to get started.</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {sortedExpenses.map((expense) => {
                    const total = (parseFloat(expense.amount) || 0) + (parseFloat(expense.gst_amount) || 0);
                    return (
                      <TableRow key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => onViewDetails && onViewDetails(expense)}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                            {expense.expense_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-slate-700 dark:text-slate-300">
                          {expense.description || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">
                          ₹{(expense.amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600 dark:text-orange-400">
                          {expense.gst_applicable ? `₹${(expense.gst_amount || 0).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{expense.payment_method}</Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30" onClick={() => onEdit && onEdit(expense)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30" onClick={() => onDelete && onDelete(expense)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Summary Row */}
                  <TableRow className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                    <TableCell colSpan={3} className="text-right">TOTAL:</TableCell>
                    <TableCell className="text-right text-slate-900 dark:text-slate-100">₹{summary.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-orange-600 dark:text-orange-400">₹{summary.totalGST.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-lg text-slate-900 dark:text-slate-100">₹{grandTotal.toFixed(2)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3 p-4">
          {sortedExpenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <List className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No expenses recorded yet.</p>
              <p className="text-sm mt-1">Add your first expense above.</p>
            </div>
          ) : (
            <>
              {sortedExpenses.map((expense) => {
                const total = (parseFloat(expense.amount) || 0) + (parseFloat(expense.gst_amount) || 0);
                return (
                  <Card key={expense.id} className="border-l-4 border-l-blue-500" onClick={() => onViewDetails && onViewDetails(expense)}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mb-2">{expense.expense_type}</Badge>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{format(new Date(expense.date), 'MMM dd, yyyy')}</p>
                          {expense.description && <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">{expense.description}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Amount</p>
                          <p className="font-semibold">₹{(expense.amount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">GST</p>
                          <p className="font-semibold text-orange-600">{expense.gst_applicable ? `₹${(expense.gst_amount || 0).toFixed(2)}` : '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="font-bold text-lg">₹{total.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit && onEdit(expense)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete && onDelete(expense)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Mobile Summary */}
              <Card className="bg-slate-100 dark:bg-slate-800 border-2">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-bold text-sm">Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Total Amount</p>
                      <p className="font-semibold">₹{summary.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total GST</p>
                      <p className="font-semibold text-orange-600">₹{summary.totalGST.toFixed(2)}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t">
                      <p className="text-xs text-slate-500">Grand Total</p>
                      <p className="font-bold text-lg">₹{grandTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseListTable;