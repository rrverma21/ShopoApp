import React from 'react';
import { Phone, MessageSquare, ShoppingCart, MapPin, Package } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ProductCard({ product }) {
  const { toast } = useToast();

  const handleAction = (action) => {
    if (action === 'call') {
      window.location.href = `tel:${product.phone || '+910000000000'}`;
      return;
    }
    
    if (action === 'chat' || action === 'order') {
      toast({
        title: action === 'chat' ? 'Chat initiated' : 'Order List',
        description: action === 'chat' 
          ? `Starting conversation with ${product.supplierName}...` 
          : `Added ${product.name} to your draft order.`,
      });
      return;
    }

    toast({
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const getStockBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'in stock':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white border-none">In Stock</Badge>;
      case 'limited':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none">Limited</Badge>;
      case 'out of stock':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white border-none">Out of Stock</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="shopo-card shopo-card-hover flex flex-col h-full">
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900 group">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 z-10 flex gap-2">
          {getStockBadge(product.stockStatus)}
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="bg-white/90 dark:bg-black/80 backdrop-blur-sm">
            {product.category}
          </Badge>
        </div>
      </div>
      
      <CardContent className="flex-1 p-4 flex flex-col">
        <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2" title={product.name}>
          {product.name}
        </h3>
        
        <div className="text-xl font-extrabold text-primary mb-3">
          {product.price}
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium truncate">{product.supplierName}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md font-medium">MOQ: {product.moq}</span>
            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md truncate">
              <MapPin className="w-3 h-3" /> {product.deliveryArea}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="shrink-0 h-10 w-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
          onClick={() => handleAction('chat')}
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="shrink-0 h-10 w-10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
          onClick={() => handleAction('call')}
        >
          <Phone className="w-4 h-4" />
        </Button>
        <Button 
          className="flex-1 h-10 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => handleAction('order')}
          disabled={product.stockStatus?.toLowerCase() === 'out of stock'}
        >
          <ShoppingCart className="w-4 h-4 mr-2" /> 
          Order
        </Button>
      </CardFooter>
    </Card>
  );
}