import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, LogOut, Clock } from "lucide-react";
import { format } from 'date-fns';
import { cn, getEmployeeInitials } from "@/lib/utils";

const ConfirmAttendanceModal = ({ open, employee, scanType, onConfirm, onCancel, autoCloseSeconds = 10 }) => {
  const [timeLeft, setTimeLeft] = useState(autoCloseSeconds);

  useEffect(() => {
    if (!open) {
        setTimeLeft(autoCloseSeconds);
        return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCancel(); // Auto-cancel if timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onCancel, autoCloseSeconds]);

  if (!employee) return null;

  const isCheckIn = scanType === 'check_in';

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl p-0 overflow-hidden">
        <div className={cn(
            "h-2 w-full",
            isCheckIn ? "bg-green-500" : "bg-blue-500"
        )} />
        
        <div className="p-6 pb-2 text-center">
            <div className="mx-auto mb-4 relative w-24 h-24">
                <Avatar className="w-24 h-24 border-4 border-slate-100 shadow-md">
                    <AvatarImage src={employee.avatar_url} />
                    <AvatarFallback className="text-2xl font-bold bg-slate-200 text-slate-600">
                        {getEmployeeInitials(employee.name)}
                    </AvatarFallback>
                </Avatar>
                <div className={cn(
                    "absolute -bottom-2 -right-2 p-2 rounded-full border-4 border-white shadow-sm",
                    isCheckIn ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                )}>
                    {isCheckIn ? <CheckCircle2 className="w-6 h-6" /> : <LogOut className="w-6 h-6" />}
                </div>
            </div>

            <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900 text-center">
                    {isCheckIn ? 'Confirm Check-In' : 'Confirm Check-Out'}
                </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-1">
                <h3 className="text-lg font-semibold text-slate-800">{employee.name}</h3>
                <p className="text-sm text-slate-500 font-medium bg-slate-100 inline-block px-3 py-1 rounded-full">
                    {employee.role?.replace('_', ' ').toUpperCase()}
                </p>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <span className="text-xl font-mono font-medium text-slate-700">
                    {format(new Date(), 'HH:mm')} <span className="text-sm text-slate-400 font-sans ml-1">{format(new Date(), 'a')}</span>
                </span>
            </div>
        </div>

        <DialogFooter className="p-6 pt-2 gap-3 sm:gap-0 bg-slate-50/50 border-t border-slate-100">
            <div className="flex w-full gap-3">
                <Button 
                    variant="outline" 
                    onClick={onCancel}
                    className="flex-1 h-12 text-base border-slate-200 hover:bg-slate-100"
                >
                    Cancel ({timeLeft}s)
                </Button>
                <Button 
                    onClick={onConfirm}
                    className={cn(
                        "flex-1 h-12 text-base font-semibold shadow-md transition-all hover:scale-[1.02]",
                        isCheckIn ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                    )}
                >
                    {isCheckIn ? 'Confirm Check-In' : 'Confirm Check-Out'}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmAttendanceModal;