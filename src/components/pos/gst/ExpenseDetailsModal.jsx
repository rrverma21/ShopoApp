import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Calendar, FileText, CreditCard, Hash, StickyNote, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const ExpenseDetailsModal = ({ expense, isOpen, onClose, onEdit, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!expense) return null;

  const totalAmount = (parseFloat(expense.amount) || 0) + (parseFloat(expense.gst_amount) || 0);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await onDelete(expense.id);
    onClose();
  };

  const handleEdit = () => {
    onEdit(expense);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold">Expense Details</DialogTitle>
            <DialogDescription>
              Recorded on {expense.date ? format(new Date(expense.date), 'PPP') : 'Unknown date'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Expense Type & Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Expense Type</p>
                <Badge variant="outline" className="text-base px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                  {expense.expense_type}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <Separator />

            {/* Description */}
            {expense.description && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</p>
                </div>
                <p className="text-base text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
                  {expense.description}
                </p>
              </div>
            )}

            {/* Financial Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Base Amount</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">₹{(expense.amount || 0).toFixed(2)}</p>
              </div>
              
              {expense.gst_applicable && (
                <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">GST Amount</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">₹{(expense.gst_amount || 0).toFixed(2)}</p>
                </div>
              )}

              <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 md:col-span-2">
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Total Amount (incl. GST)</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <Separator />

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Date</p>
                  <p className="text-base text-slate-900 dark:text-slate-100">
                    {expense.date ? format(new Date(expense.date), 'PPP') : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method</p>
                  <Badge variant="secondary">{expense.payment_method || 'Not specified'}</Badge>
                </div>
              </div>

              {expense.reference_no && (
                <div className="flex items-start gap-3">
                  <Hash className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Reference/Bill No</p>
                    <p className="text-base text-slate-900 dark:text-slate-100 font-mono">{expense.reference_no}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">GST Applicable</p>
                  <Badge variant={expense.gst_applicable ? "default" : "secondary"}>
                    {expense.gst_applicable ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Notes */}
            {expense.notes && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</p>
                  </div>
                  <p className="text-base text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 p-3 rounded-md whitespace-pre-wrap">
                    {expense.notes}
                  </p>
                </div>
              </>
            )}

            {/* Metadata */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Created: {expense.created_at ? format(new Date(expense.created_at), 'PPpp') : 'Unknown'}</p>
              {expense.updated_at && (
                <p>Last updated: {format(new Date(expense.updated_at), 'PPpp')}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense record for {expense.expense_type} (₹{totalAmount.toFixed(2)}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExpenseDetailsModal;