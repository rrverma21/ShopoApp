import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/lib/utils';

export default function CreditConfirmDialog({ open, onOpenChange, totalAmount, customer, onConfirm }) {
    const { t } = useLanguage();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-purple-500" /> {t('pos.confirmCredit')}
                    </DialogTitle>
                    <DialogDescription className="text-[var(--text-secondary)]">
                        {t('pos.creditDesc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex justify-between p-3 bg-slate-900 rounded border border-slate-800">
                        <span>New Credit Amount (Cart)</span>
                        <span className="font-bold text-xl">{formatPrice(totalAmount)}</span>
                    </div>
                    {customer ? (
                        <div className="text-sm">
                            <span className="text-muted-foreground">{t('pos.customer')}:</span> <span className="font-semibold text-lg">{customer.name}</span>
                            <div className="text-xs text-muted-foreground">{customer.phone}</div>
                        </div>
                    ) : (
                        <div className="text-red-400 text-sm font-medium">
                            Please select a customer first to process a credit sale.
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
                    <Button onClick={onConfirm} disabled={!customer} className="bg-purple-600 hover:bg-purple-700 text-white">{t('common.confirm')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}