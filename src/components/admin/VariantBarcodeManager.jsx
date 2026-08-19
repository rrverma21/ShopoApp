import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Barcode, AlertCircle, CheckCircle2, ScanLine, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const VariantBarcodeManager = ({ variants, onChange }) => {
    const [localVariants, setLocalVariants] = useState([]);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        // Initialize local state from props
        setLocalVariants(variants.map(v => ({
            ...v,
            barcode: v.barcode || ''
        })));
    }, [variants]);

    const validateBarcode = (barcode, currentIndex) => {
        if (!barcode) return null; // Empty is allowed

        // 1. Format Check (Alphanumeric, 3-50 chars)
        const alphanumericRegex = /^[a-zA-Z0-9]{3,50}$/; 
        if (!alphanumericRegex.test(barcode)) {
            return "Invalid format (3-50 alphanumeric)";
        }

        // 2. Duplicate Check within current list
        const isDuplicateLocal = localVariants.some((v, idx) => 
            v.barcode === barcode && idx !== currentIndex
        );
        if (isDuplicateLocal) {
            return "Duplicate barcode in this product";
        }

        return null;
    };

    const handleBarcodeChange = (index, value) => {
        const newVariants = [...localVariants];
        newVariants[index] = { ...newVariants[index], barcode: value };
        
        // Validate
        const error = validateBarcode(value, index);
        setErrors(prev => ({
            ...prev,
            [index]: error
        }));

        setLocalVariants(newVariants);
        onChange(newVariants);
    };

    const hasErrors = Object.values(errors).some(e => e !== null);

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
                            <Barcode className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">Variant Barcodes</CardTitle>
                            <CardDescription className="text-sm text-gray-500">Manage unique barcodes for each product variant.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    {hasErrors && (
                        <Alert variant="destructive" className="mb-6 shadow-sm border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Validation Errors</AlertTitle>
                            <AlertDescription>
                                Please fix the barcode errors before saving.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                    <TableRow>
                                        <TableHead className="w-[200px]">Variant</TableHead>
                                        <TableHead className="w-[100px]">Stock</TableHead>
                                        <TableHead className="w-[100px]">Price</TableHead>
                                        <TableHead className="min-w-[250px]">Barcode</TableHead>
                                        <TableHead className="w-[50px] text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {localVariants.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Info className="w-8 h-8 text-gray-300" />
                                                    <p>No variants defined yet.</p>
                                                    <p className="text-xs">Add variants in the "Variants" tab first.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        localVariants.map((variant, index) => (
                                            <TableRow key={index} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-gray-900 dark:text-gray-100">{variant.name || 'Unnamed'}</span>
                                                        <span className="text-xs text-gray-400">{variant.sku}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        "bg-white dark:bg-gray-950", 
                                                        variant.stock <= 5 ? "text-amber-600 border-amber-200" : "text-gray-600 border-gray-200"
                                                    )}>
                                                        {variant.stock} units
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        {variant.price ? `₹${variant.price}` : '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="relative group/input">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-indigo-500 transition-colors">
                                                            <ScanLine className="w-4 h-4" />
                                                        </div>
                                                        <Input
                                                            value={variant.barcode}
                                                            onChange={(e) => handleBarcodeChange(index, e.target.value)}
                                                            placeholder="Scan or enter barcode"
                                                            className={cn(
                                                                "pl-9 pr-4 transition-all duration-200",
                                                                errors[index] 
                                                                    ? "border-red-300 focus-visible:ring-red-200 bg-red-50/30" 
                                                                    : "border-gray-200 focus-visible:ring-indigo-200 hover:border-indigo-300"
                                                            )}
                                                        />
                                                    </div>
                                                    {errors[index] && (
                                                        <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1.5 animate-in slide-in-from-top-1">
                                                            <AlertCircle className="w-3 h-3" /> {errors[index]}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center items-center h-full">
                                                        {!errors[index] && variant.barcode ? (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Valid Barcode</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        ) : (
                                                            <div className="w-6 h-6" /> // Spacer
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Barcode Tips</h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                                Barcodes must be unique across all variants. You can use a USB scanner or mobile camera to fill these fields quickly.
                                Changes are saved when you update the main product.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default VariantBarcodeManager;