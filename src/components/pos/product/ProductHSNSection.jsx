import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, AlertCircle } from 'lucide-react';
import { useHSNMaster } from '@/hooks/useHSNMaster';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';

const ProductHSNSection = ({ 
  productData, 
  categoryId,
  onHSNChange 
}) => {
  const { hsnCodes, loading: hsnLoading } = useHSNMaster();
  const [categoryHSN, setCategoryHSN] = useState(null);
  const [loadingCategory, setLoadingCategory] = useState(false);

  const manualOverride = productData?.manual_hsn_override || false;
  const selectedHSNId = productData?.hsn_id || null;

  useEffect(() => {
    const fetchCategoryHSN = async () => {
      if (!categoryId) {
        setCategoryHSN(null);
        return;
      }

      setLoadingCategory(true);
      try {
        const { data: categoryData, error } = await supabase
          .from('categories')
          .select(`
            id,
            name,
            default_hsn_id,
            hsn_master:default_hsn_id (
              id,
              hsn_code,
              gst_percentage,
              label,
              description
            )
          `)
          .eq('id', categoryId)
          .single();

        if (error) throw error;

        if (categoryData?.hsn_master) {
          setCategoryHSN({
            ...categoryData.hsn_master,
            category_name: categoryData.name
          });
        } else {
          setCategoryHSN(null);
        }
      } catch (error) {
        console.error('Error fetching category HSN:', error);
        setCategoryHSN(null);
      } finally {
        setLoadingCategory(false);
      }
    };

    fetchCategoryHSN();
  }, [categoryId]);

  const handleOverrideChange = (checked) => {
    if (checked) {
      // Enable manual override - keep current HSN selection
      onHSNChange({
        manual_hsn_override: true,
        hsn_id: selectedHSNId
      });
    } else {
      // Disable manual override - inherit from category
      onHSNChange({
        manual_hsn_override: false,
        hsn_id: categoryHSN?.id || null
      });
    }
  };

  const handleHSNSelect = (hsnId) => {
    onHSNChange({
      manual_hsn_override: manualOverride,
      hsn_id: hsnId || null
    });
  };

  const currentHSN = hsnCodes.find(h => h.id === selectedHSNId);
  const displayHSN = manualOverride ? currentHSN : categoryHSN;

  if (loadingCategory) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            HSN & GST Configuration
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Products automatically inherit HSN code from their category. 
                    Enable manual override to assign a different HSN code.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          {manualOverride && (
            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
              Manual Override
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inherited HSN Display (when not manually overridden) */}
        {!manualOverride && categoryHSN && (
          <div className="p-4 border-2 border-muted rounded-lg bg-muted/30">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Inherited from Category:
                  </p>
                  <span className="text-sm font-semibold">{categoryHSN.category_name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {categoryHSN.hsn_code}
                  </Badge>
                  <span className="text-sm font-medium">{categoryHSN.label}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {categoryHSN.gst_percentage}% GST
                  </Badge>
                </div>
                {categoryHSN.description && (
                  <p className="text-xs text-muted-foreground italic">
                    {categoryHSN.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Category HSN Warning */}
        {!manualOverride && !categoryHSN && categoryId && (
          <div className="p-4 border-2 border-dashed border-amber-200 rounded-lg bg-amber-50/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900">
                  Category has no default HSN set
                </p>
                <p className="text-xs text-amber-700">
                  Enable manual override below to assign an HSN code to this product.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No Category Selected Warning */}
        {!categoryId && (
          <div className="p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/50">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900">
                Select a category first to inherit HSN configuration, or enable manual override.
              </p>
            </div>
          </div>
        )}

        {/* Manual Override Toggle */}
        <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
          <Checkbox
            id="manual-override"
            checked={manualOverride}
            onCheckedChange={handleOverrideChange}
            className="mt-0.5"
          />
          <div className="space-y-1 flex-1">
            <Label
              htmlFor="manual-override"
              className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
            >
              Use Manual HSN Override
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      When enabled, this product will use a custom HSN code instead of 
                      inheriting from its category. Changes to the category's HSN will not 
                      affect this product.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <p className="text-xs text-muted-foreground">
              Assign a different HSN code for this product
            </p>
          </div>
        </div>

        {/* Manual HSN Selection */}
        {manualOverride && (
          <div className="space-y-3 pt-2">
            <Label htmlFor="hsn-select" className="text-sm font-medium">
              Select HSN Code
            </Label>
            <Select 
              value={selectedHSNId || ''} 
              onValueChange={handleHSNSelect}
              disabled={hsnLoading}
            >
              <SelectTrigger id="hsn-select" className="w-full">
                <SelectValue placeholder={hsnLoading ? "Loading HSN codes..." : "Choose HSN Code"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="">
                  <span className="text-muted-foreground">None (No HSN)</span>
                </SelectItem>
                {hsnCodes.map((hsn) => (
                  <SelectItem key={hsn.id} value={hsn.id}>
                    <div className="flex items-center gap-2 py-1">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {hsn.hsn_code}
                      </Badge>
                      <span className="font-medium">{hsn.label}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {hsn.gst_percentage}%
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentHSN && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <span className="text-sm text-muted-foreground">Selected GST Rate:</span>
                <Badge variant="default">{currentHSN.gst_percentage}%</Badge>
                {currentHSN.description && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{currentHSN.description}</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Current Product HSN Summary */}
        {displayHSN && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Current Product HSN
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="font-mono">
                {displayHSN.hsn_code}
              </Badge>
              <span className="text-sm font-semibold">{displayHSN.label}</span>
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200"
              >
                GST: {displayHSN.gst_percentage}%
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductHSNSection;