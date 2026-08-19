import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, X, Check } from 'lucide-react';
import { useHSNMaster } from '@/hooks/useHSNMaster';
import { Separator } from '@/components/ui/separator';

const ProductHSNFilter = ({ 
  onFilterChange, 
  products = [],
  className = "" 
}) => {
  const { hsnCodes } = useHSNMaster();
  
  // Filter state
  const [selectedHSNId, setSelectedHSNId] = useState('all');
  const [selectedGSTRate, setSelectedGSTRate] = useState('all');
  const [showManualOverride, setShowManualOverride] = useState(false);

  // Get unique HSN codes and GST rates from products
  const { usedHSNCodes, usedGSTRates } = useMemo(() => {
    const hsnSet = new Set();
    const gstSet = new Set();

    products.forEach(product => {
      if (product.hsn_master) {
        hsnSet.add(product.hsn_master.id);
        if (product.hsn_master.gst_percentage !== null) {
          gstSet.add(product.hsn_master.gst_percentage);
        }
      }
    });

    const usedHSN = hsnCodes.filter(hsn => hsnSet.has(hsn.id));
    const usedGST = Array.from(gstSet).sort((a, b) => a - b);

    return { usedHSNCodes: usedHSN, usedGSTRates: usedGST };
  }, [products, hsnCodes]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedHSNId !== 'all') count++;
    if (selectedGSTRate !== 'all') count++;
    if (showManualOverride) count++;
    return count;
  }, [selectedHSNId, selectedGSTRate, showManualOverride]);

  // Apply filters
  const handleApplyFilters = () => {
    onFilterChange({
      hsnId: selectedHSNId === 'all' ? null : selectedHSNId,
      gstRate: selectedGSTRate === 'all' ? null : parseFloat(selectedGSTRate),
      manualOverride: showManualOverride
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedHSNId('all');
    setSelectedGSTRate('all');
    setShowManualOverride(false);
    onFilterChange({
      hsnId: null,
      gstRate: null,
      manualOverride: false
    });
  };

  // Auto-apply filters when they change
  useEffect(() => {
    handleApplyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHSNId, selectedGSTRate, showManualOverride]);

  // Get GST rate badge color
  const getGSTBadgeColor = (rate) => {
    if (rate <= 5) return 'bg-green-100 text-green-700 border-green-200';
    if (rate <= 12) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (rate <= 18) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle className="text-base">HSN & GST Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="h-5 min-w-[20px] flex items-center justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* HSN Code Filter */}
        <div className="space-y-2">
          <Label htmlFor="hsn-filter" className="text-sm font-medium">
            Filter by HSN Code
          </Label>
          <Select value={selectedHSNId} onValueChange={setSelectedHSNId}>
            <SelectTrigger id="hsn-filter">
              <SelectValue placeholder="All HSN Codes" />
            </SelectTrigger>
            <SelectContent className="max-h-[250px]">
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <span className="font-medium">All HSN Codes</span>
                  <Badge variant="secondary" className="ml-auto">
                    {products.length}
                  </Badge>
                </div>
              </SelectItem>
              <SelectItem value="no-hsn">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">No HSN Assigned</span>
                  <Badge variant="secondary" className="ml-auto">
                    {products.filter(p => !p.hsn_master).length}
                  </Badge>
                </div>
              </SelectItem>
              {usedHSNCodes.length > 0 && <Separator className="my-1" />}
              {usedHSNCodes.map((hsn) => {
                const count = products.filter(p => p.hsn_master?.id === hsn.id).length;
                return (
                  <SelectItem key={hsn.id} value={hsn.id}>
                    <div className="flex items-center gap-2 py-1">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {hsn.hsn_code}
                      </Badge>
                      <span className="font-medium text-sm">{hsn.label}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {count}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* GST Rate Filter */}
        <div className="space-y-2">
          <Label htmlFor="gst-filter" className="text-sm font-medium">
            Filter by GST Rate
          </Label>
          <Select value={selectedGSTRate} onValueChange={setSelectedGSTRate}>
            <SelectTrigger id="gst-filter">
              <SelectValue placeholder="All GST Rates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <span className="font-medium">All GST Rates</span>
                  <Badge variant="secondary" className="ml-auto">
                    {products.length}
                  </Badge>
                </div>
              </SelectItem>
              {usedGSTRates.map((rate) => {
                const count = products.filter(
                  p => p.hsn_master?.gst_percentage === rate
                ).length;
                return (
                  <SelectItem key={rate} value={rate.toString()}>
                    <div className="flex items-center gap-2 py-1">
                      <Badge className={getGSTBadgeColor(rate)}>
                        {rate}% GST
                      </Badge>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {count}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Manual Override Filter */}
        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
          <Checkbox
            id="manual-override-filter"
            checked={showManualOverride}
            onCheckedChange={setShowManualOverride}
          />
          <div className="flex-1">
            <Label
              htmlFor="manual-override-filter"
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              Manual Override Only
              {showManualOverride && (
                <Badge variant="default" className="bg-amber-500 h-5">
                  {products.filter(p => p.manual_hsn_override).length}
                </Badge>
              )}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Show only products with custom HSN assignments
            </p>
          </div>
        </div>

        {/* Filter Summary */}
        {activeFilterCount > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Filters:</span>
              <div className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-medium">{activeFilterCount} applied</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductHSNFilter;