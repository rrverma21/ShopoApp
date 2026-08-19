import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DeleteCategoryDialog = ({ 
  open, 
  onOpenChange, 
  category, 
  onConfirm, 
  loading = false 
}) => {
  if (!category) return null;

  const hasProducts = category.product_count > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-xl">
              Delete Category
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                You are about to delete:
              </p>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: category.color || '#3b82f6' }}
                />
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {category.name}
                </span>
              </div>
              {category.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {category.description}
                </p>
              )}
            </div>

            {hasProducts ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Products in this category
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        {category.product_count} product{category.product_count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      These products will be moved to "Uncategorized" and remain in your inventory.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                  This category has no products and can be safely deleted.
                </p>
              </div>
            )}

            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-slate-100">This action cannot be undone.</strong> 
              {' '}The category will be permanently removed from your system.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Deleting...
              </>
            ) : (
              <>Delete Category</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCategoryDialog;