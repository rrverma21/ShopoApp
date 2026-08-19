import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ImageOff, Sparkles } from "lucide-react";

export default function BarcodeProductPreview({ product, onDismiss }) {
  if (!product) return null;

  // Resolve images correctly based on the new schema mapping
  const img1 = product.image_url || product.images?.[0];
  const img2 = product.images?.[1];

  return (
    <Card className="bg-blue-50 border-blue-200 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-4">
      <CardContent className="p-4 sm:p-5">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full"
          onClick={onDismiss}
          title="Dismiss Preview"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex gap-2">
            {/* Image 1 Preview */}
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-md border border-blue-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {img1 ? (
                <img src={img1} alt={`${product.name} 1`} className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-6 w-6 text-blue-300" />
              )}
            </div>
            
            {/* Image 2 Preview */}
            {img2 && (
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-md border border-blue-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                <img src={img2} alt={`${product.name} 2`} className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                <Sparkles className="w-3 h-3 mr-1" /> Auto-filled
              </Badge>
              <h4 className="font-semibold text-slate-800 text-sm sm:text-base leading-tight">
                {product.name}
              </h4>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600">
              {product.mrp && (
                <span className="flex items-center">
                  <span className="font-medium text-slate-500 mr-1">MRP:</span> ₹{parseFloat(product.mrp).toFixed(2)}
                </span>
              )}
              {product.category && (
                <span className="flex items-center">
                  <span className="font-medium text-slate-500 mr-1">Category:</span> {product.category}
                </span>
              )}
              {product.sku && (
                <span className="flex items-center">
                  <span className="font-medium text-slate-500 mr-1">SKU:</span> {product.sku}
                </span>
              )}
            </div>
            <p className="text-xs text-blue-600 font-medium">Fields have been pre-filled from contributed products.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}