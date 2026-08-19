import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar, Clock, DollarSign, Activity } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const WaterOrderSorting = React.memo(({ sortConfig, onSortChange }) => {
    
    const getIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-auto h-3.5 w-3.5 text-blue-600" /> : <ArrowDown className="ml-auto h-3.5 w-3.5 text-blue-600" />;
    };

    const isActive = (key) => sortConfig.key === key;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 bg-white border-slate-200 rounded-lg whitespace-nowrap text-sm px-3">
                    <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-slate-500" />
                    Sort
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs font-semibold text-slate-500">Sort Orders By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                    onClick={() => onSortChange('created_at')}
                    className={cn("cursor-pointer", isActive('created_at') && "bg-blue-50 text-blue-700")}
                >
                    <Calendar className="mr-2 h-3.5 w-3.5 opacity-70" /> Date {getIcon('created_at')}
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                    onClick={() => onSortChange('is_urgent')}
                    className={cn("cursor-pointer", isActive('is_urgent') && "bg-blue-50 text-blue-700")}
                >
                    <Clock className="mr-2 h-3.5 w-3.5 opacity-70" /> Urgency {getIcon('is_urgent')}
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                    onClick={() => onSortChange('status')}
                    className={cn("cursor-pointer", isActive('status') && "bg-blue-50 text-blue-700")}
                >
                    <Activity className="mr-2 h-3.5 w-3.5 opacity-70" /> Status {getIcon('status')}
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                    onClick={() => onSortChange('total_price')}
                    className={cn("cursor-pointer", isActive('total_price') && "bg-blue-50 text-blue-700")}
                >
                    <DollarSign className="mr-2 h-3.5 w-3.5 opacity-70" /> Amount {getIcon('total_price')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

WaterOrderSorting.displayName = "WaterOrderSorting";

export default WaterOrderSorting;