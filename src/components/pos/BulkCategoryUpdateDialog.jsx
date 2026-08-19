import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, FolderOpen } from "lucide-react";

const BulkCategoryUpdateDialog = ({ 
  open, 
  onOpenChange, 
  selectedProducts = [], 
  categories = [], 
  onUpdate 
}) => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedCategory("");
      setIsUpdating(false);
    }
  }, [open]);

  // Get unique current categories from selected products
  const currentCategories = [...new Set(
    selectedProducts
      .map(p => p.category)
      .filter(Boolean)
  )];

  const handleUpdate = async () => {
    if (!selectedCategory) return;
    setIsUpdating(true);
    await onUpdate(selectedCategory);
    setIsUpdating(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isUpdating && onOpenChange(val)}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Update Category for Selected Products
          </DialogTitle>
          <DialogDescription>
            Update the category for {selectedProducts.length} selected product{selectedProducts.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Current Categories Display */}
          {currentCategories.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Current Categories:
              </label>
              <div className="flex flex-wrap gap-2">
                {currentCategories.length === 1 ? (
                  <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800">
                    {currentCategories[0]}
                  </Badge>
                ) : (
                  <>
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                      Multiple categories
                    </Badge>
                    {currentCategories.map((cat, idx) => (
                      <Badge key={idx} variant="outline" className="bg-slate-50 dark:bg-slate-800">
                        {cat}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              New Category <span className="text-red-500">*</span>
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isUpdating}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent className="max-h-[500px]">
                {categories.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No categories available
                  </div>
                ) : (
                  <ScrollArea className="h-full max-h-[500px] w-full custom-scrollbar">
                    <div className="py-1 px-1">
                      {categories.map((category) => (
                        <SelectItem 
                          key={category} 
                          value={category}
                          className="cursor-pointer"
                        >
                          {category}
                        </SelectItem>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Products List */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Products to Update:
            </label>
            <ScrollArea className="h-48 rounded-md border bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
              <div className="p-3 space-y-2">
                {selectedProducts.map((product, idx) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        SKU: {product.sku || 'N/A'}
                        {product.category && (
                          <span className="ml-2">
                            • Current: <span className="text-slate-600 dark:text-slate-400">{product.category}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate}
            disabled={!selectedCategory || isUpdating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkCategoryUpdateDialog;