import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Hash, Percent } from 'lucide-react';

const BulkHSNCodeDialog = ({ open, onOpenChange, selectedCount, onConfirm, isApplying }) => {
  const [hsnCode, setHsnCode] = useState('');
  const [gstRate, setGstRate] = useState('');
  const [error, setError] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setHsnCode('');
      setGstRate('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    if (!hsnCode) {
      setError('HSN code is required');
      return;
    }

    // Validate 8-digit format
    if (!/^\d{8}$/.test(hsnCode)) {
      setError('HSN code must be exactly 8 digits');
      return;
    }

    if (!gstRate) {
      setError('GST % is required');
      return;
    }

    const parsedGst = parseFloat(gstRate);
    if (isNaN(parsedGst) || parsedGst < 0 || parsedGst > 100) {
      setError('GST % must be between 0 and 100');
      return;
    }

    setError('');
    onConfirm({ hsnCode, gstRate: parsedGst });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-indigo-600" />
            Set HSN Code & GST %
          </DialogTitle>
          <DialogDescription>
            Apply an HSN code and GST % to <strong className="text-slate-900 dark:text-white">{selectedCount}</strong> selected product{selectedCount !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-5">
          <div className="space-y-3">
            <Label htmlFor="hsnCode" className="font-semibold text-slate-700 dark:text-slate-300">
              HSN Code
            </Label>
            <Input
              id="hsnCode"
              placeholder="Enter HSN code (8 digits)"
              value={hsnCode}
              onChange={(e) => {
                // Allow only digits and max 8 chars
                const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                setHsnCode(val);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              maxLength={8}
              className={`text-lg tracking-widest font-mono h-12 transition-colors ${error && !hsnCode ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-indigo-500'}`}
            />
            <p className="text-xs text-slate-500">
              HSN code format: 8 digits (e.g., 12345678)
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="gstRate" className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" /> GST %
            </Label>
            <Input
              id="gstRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Enter GST % (e.g., 5, 12, 18, 28)"
              value={gstRate}
              onChange={(e) => {
                setGstRate(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              className={`text-lg h-12 transition-colors ${error && !gstRate ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-indigo-500'}`}
            />
            <p className="text-xs text-slate-500">
              GST percentage (e.g., 5, 12, 18, 28)
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium animate-in slide-in-from-top-1">
              {error}
            </p>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isApplying}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isApplying || hsnCode.length !== 8 || !gstRate}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              'Apply'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkHSNCodeDialog;