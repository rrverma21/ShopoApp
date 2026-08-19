import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { cn } from "@/lib/utils";

const ScanHistoryList = ({ scans = [] }) => {
  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
      <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" /> Recent Scans
        </h3>
        <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded-full border border-slate-700">
            Today
        </span>
      </div>
      
      <ScrollArea className="flex-1 p-0">
        <div className="divide-y divide-slate-700/50">
            {scans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                    <History className="w-8 h-8 opacity-20" />
                    <p className="text-sm">No scans yet today</p>
                </div>
            ) : (
                scans.map((scan, idx) => {
                    const isCheckIn = scan.type === 'check_in';
                    const isSuccess = scan.status === 'success';
                    return (
                        <div key={scan.id || idx} className="p-4 flex items-center gap-4 hover:bg-slate-700/30 transition-colors">
                            <Avatar className="h-10 w-10 border border-slate-600">
                                <AvatarFallback className={cn("text-xs font-bold", isCheckIn ? "bg-green-900 text-green-200" : "bg-blue-900 text-blue-200")}>
                                    {scan.employeeName?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">{scan.employeeName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={cn(
                                        "text-[10px] uppercase font-bold tracking-wider flex items-center gap-1",
                                        isCheckIn ? "text-green-400" : "text-blue-400"
                                    )}>
                                        {isCheckIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                        {isCheckIn ? 'IN' : 'OUT'}
                                    </span>
                                    <span className="text-slate-600 text-[10px]">•</span>
                                    <span className="text-xs text-slate-400 font-mono">
                                        {format(new Date(scan.timestamp), 'h:mm:ss a')}
                                    </span>
                                </div>
                            </div>
                            {!isSuccess && <span className="text-xs text-red-400 font-medium">Failed</span>}
                        </div>
                    );
                })
            )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScanHistoryList;