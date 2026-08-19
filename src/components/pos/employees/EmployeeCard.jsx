import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, MoreVertical, Eye, QrCode, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getRoleColor } from "./RoleSelector";
import { format } from 'date-fns';
import { QRCodeCanvas } from 'qrcode.react';
import { generateQRCodeDataStatic, downloadQRCodePNG } from '@/lib/qrCodeGenerator';
import { getEmployeeInitials } from '@/lib/utils';

const EmployeeCard = ({ employee, onEdit, onDelete, onView }) => {
  // Use the employee ID directly via generator for consistent raw data
  const qrData = generateQRCodeDataStatic(employee.id);
  const qrId = `mini-qr-${employee.id}`;

  return (
    <Card 
        className="hover:shadow-2xl transition-all duration-300 overflow-hidden border-slate-200 group cursor-pointer rounded-xl flex flex-col h-full bg-white hover:border-blue-200"
        onClick={() => onView(employee)}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header with Actions */}
        <div className="p-4 flex items-start justify-between gap-4 border-b border-slate-50 bg-slate-50/30">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2 border-white shadow-sm ring-2 ring-slate-100">
              <AvatarImage src={employee.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                {getEmployeeInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-slate-900 line-clamp-1 text-base group-hover:text-blue-700 transition-colors">{employee.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{employee.email}</p>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                    <MoreVertical className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(employee)}>
                    <Eye className="mr-2 h-4 w-4" /> View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(employee)}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadQRCodePNG(qrId, `${employee.name}_QR`)}>
                    <QrCode className="mr-2 h-4 w-4" /> Download QR
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(employee)} className="text-red-600 focus:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Body Info */}
        <div className="px-5 py-4 space-y-4 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className={`${getRoleColor(employee.role)} shadow-sm`}>
              {employee.role.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="outline" className={`${employee.status === 'active' ? 'border-green-200 text-green-700 bg-green-50' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
              {employee.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs pt-2">
            <div>
              <span className="block text-slate-400 mb-0.5">Phone</span>
              <span className="font-medium text-slate-700">{employee.phone}</span>
            </div>
            <div>
              <span className="block text-slate-400 mb-0.5">Joined</span>
              <span className="font-medium text-slate-700">{employee.joining_date ? format(new Date(employee.joining_date), 'MMM d, yyyy') : '-'}</span>
            </div>
          </div>

          {/* Hidden Mini QR for generation - ensures clean ID encoding */}
          <div id={qrId} className="hidden">
             <QRCodeCanvas value={qrData} size={200} level="H" includeMargin />
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 pt-0 mt-auto">
            <Button 
                variant="outline" 
                className="w-full border-blue-100 text-blue-600 hover:bg-blue-50 hover:text-blue-700 group-hover:border-blue-300 transition-colors"
            >
                <User className="w-4 h-4 mr-2" /> View Profile
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;