import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { generateQRCodeDataStatic } from '@/lib/qrCodeGenerator';

const QRCodeDisplay = ({ employeeId, employeeName, size = 200, className, showLabel = true }) => {
  const [loading, setLoading] = useState(true);
  
  // Use generator to ensure raw UUID (Task 2)
  const qrData = generateQRCodeDataStatic(employeeId);

  useEffect(() => {
    // Simulate loading for better UX perception of generation
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [employeeId]);

  if (!employeeId) return null;

  return (
    <div className={cn("flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm", className)}>
      {showLabel && (
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Employee QR Code
        </h3>
      )}
      
      <div className="relative flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}
        
        <div className="p-2 bg-white rounded-lg shadow-inner border border-slate-100">
            <QRCodeCanvas 
                value={qrData} 
                size={size} 
                level={"H"}
                includeMargin={true}
                className="rounded-md"
            />
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-slate-400 font-mono select-all">
          ID: {employeeId}
        </p>
        {employeeName && (
            <p className="text-sm font-bold text-slate-800 mt-1">{employeeName}</p>
        )}
      </div>
    </div>
  );
};

export default QRCodeDisplay;