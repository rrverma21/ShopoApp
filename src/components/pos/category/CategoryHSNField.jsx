import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useHSNMaster } from '@/hooks/useHSNMaster';

const CategoryHSNField = ({ value, onChange, label = "Default HSN Code" }) => {
  const { hsnCodes, loading } = useHSNMaster();

  const selectedHSN = hsnCodes.find(h => h.id === value);

  return (
    <div className="space-y-2">
      <Label htmlFor="hsn-select" className="text-sm font-medium">
        {label}
        <span className="text-muted-foreground ml-1">(Optional)</span>
      </Label>
      
      <Select value={value || ''} onValueChange={onChange} disabled={loading}>
        <SelectTrigger id="hsn-select">
          <SelectValue placeholder={loading ? "Loading..." : "Select HSN"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">None - No Default HSN</SelectItem>
          {hsnCodes.map((hsn) => (
            <SelectItem key={hsn.id} value={hsn.id}>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{hsn.name || hsn.label}</span>
                {hsn.hsn_code && <span className="font-mono text-muted-foreground">({hsn.hsn_code})</span>}
                <Badge variant="secondary" className="ml-2">
                  {hsn.gst_percentage || 0}%
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedHSN && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>GST Rate:</span>
          <Badge variant="outline">{selectedHSN.gst_percentage || 0}%</Badge>
          {selectedHSN.description && (
            <span className="ml-2">• {selectedHSN.description}</span>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Products in this category will inherit this HSN (unless manually overridden)
      </p>
    </div>
  );
};

export default CategoryHSNField;