import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const AttendanceStatusBadge = ({ status, className }) => {
  const getStatusConfig = (s) => {
    switch (String(s).toLowerCase()) {
      case 'present':
        return { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'Present' };
      case 'absent':
        return { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Absent' };
      case 'leave':
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'On Leave' };
      case 'half_day':
        return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock, label: 'Half Day' };
      case 'exception':
        return { color: 'bg-red-50 text-red-600 border-red-200', icon: AlertTriangle, label: 'Exception' };
      default:
        return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock, label: s || 'Unknown' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1.5 px-2.5 py-0.5", config.color, className)}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </Badge>
  );
};

export default AttendanceStatusBadge;