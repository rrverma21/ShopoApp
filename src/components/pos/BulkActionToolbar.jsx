import React from 'react';
import { Button } from '@/components/ui/button';
import { X, FolderOpen, Printer, Eye, EyeOff, Archive, Tag, Trash2, Hash } from 'lucide-react';

const BulkActionToolbar = ({
  selectedCount,
  onChangeCategory,
  onSetHSN,
  onClearSelection,
  onPrintLabels,
  onBulkShow,
  onBulkHide,
  onBulkArchive,
  onBulkRestore,
  onBulkOffer,
  onBulkDelete,
  isArchiveView
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed sm:sticky bottom-[72px] sm:bottom-0 left-0 right-0 sm:top-0 z-40 p-4 bg-white dark:bg-slate-900 border-y shadow-[0_-4px_10px_rgba(0,0,0,0.1)] sm:shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-4 sm:slide-in-from-top-4">
      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
        <span className="bg-blue-600 text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-sm">
          {selectedCount} selected
        </span>
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-slate-500 hover:text-slate-800">
          <X className="w-4 h-4 mr-2" /> Clear
        </Button>
      </div>
      
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
        <Button variant="outline" size="sm" onClick={onChangeCategory} className="border-slate-300">
          <FolderOpen className="w-4 h-4 mr-2 text-blue-600" /> Category
        </Button>
        <Button variant="outline" size="sm" onClick={onSetHSN} className="border-slate-300">
          <Hash className="w-4 h-4 mr-2 text-indigo-600" /> Set HSN Code
        </Button>
        <Button variant="outline" size="sm" onClick={onPrintLabels} className="border-slate-300">
          <Printer className="w-4 h-4 mr-2 text-slate-700" /> Labels
        </Button>
        
        {!isArchiveView && (
          <>
            <Button variant="outline" size="sm" onClick={onBulkShow} className="border-slate-300">
              <Eye className="w-4 h-4 mr-2 text-emerald-600" /> Show
            </Button>
            <Button variant="outline" size="sm" onClick={onBulkHide} className="border-slate-300">
              <EyeOff className="w-4 h-4 mr-2 text-slate-500" /> Hide
            </Button>
            <Button variant="outline" size="sm" onClick={onBulkOffer} className="border-slate-300">
              <Tag className="w-4 h-4 mr-2 text-amber-600" /> Offer
            </Button>
            <Button variant="outline" size="sm" onClick={onBulkArchive} className="border-slate-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
              <Archive className="w-4 h-4 mr-2" /> Archive
            </Button>
          </>
        )}
        
        {isArchiveView && (
          <Button variant="outline" size="sm" onClick={onBulkRestore} className="border-slate-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">
            <Archive className="w-4 h-4 mr-2" /> Restore
          </Button>
        )}
        
        <Button variant="outline" size="sm" onClick={onBulkDelete} className="border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </Button>
      </div>
    </div>
  );
};

export default BulkActionToolbar;