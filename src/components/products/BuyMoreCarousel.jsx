import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Plus } from 'lucide-react';
import { formatPrice, getPriceForQuantity } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';

const BuyMoreCarousel = ({ products }) => {
    const { addToCart } = useCart();
    const { toast } = useToast();
    const scrollRef = useRef(null);
    const requestRef = useRef();
    const isHoveringRef = useRef(false);

    // Duplicate products for infinite scroll effect
    // We only duplicate if we have enough products to warrant scrolling
    const displayProducts = products.length > 0 ? [...products, ...products] : [];
    const shouldAnimate = products.length >= 4;

    const animateScroll = () => {
        if (scrollRef.current && !isHoveringRef.current) {
            scrollRef.current.scrollLeft += 0.8; // Speed
            
            // If we've scrolled past the first set of items (halfway), reset to 0
            // We use scrollWidth / 2 assuming the two sets are identical in width
            if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth / 2) {
                scrollRef.current.scrollLeft = 0;
            }
        }
        requestRef.current = requestAnimationFrame(animateScroll);
    };

    useEffect(() => {
        if (shouldAnimate) {
             requestRef.current = requestAnimationFrame(animateScroll);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [shouldAnimate, products]);

    const handleMouseEnter = () => isHoveringRef.current = true;
    const handleMouseLeave = () => isHoveringRef.current = false;

    const handleAddToCart = (product) => {
        const qty = product.min_order_quantity || 1;
        const priceInfo = getPriceForQuantity(product, qty);
        
        if (priceInfo) {
            addToCart({
                ...product,
                price: priceInfo.price,
                variant_name: null,
                image_url: product.image_url
            }, qty);
             toast({
                title: "Added to Cart",
                description: `${product.name} added.`,
            });
        } else {
             toast({
                title: "Error",
                description: "Price not available for this product.",
                variant: "destructive"
            });
        }
    };

    if (!products || products.length === 0) return null;

    return (
        <div className="pt-8 border-t border-slate-200 dark:border-slate-700 w-full">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
                <h3 className="text-xl font-bold flex items-center text-slate-800 dark:text-slate-100">
                    <ShoppingBag className="mr-2 h-5 w-5 text-blue-600" />
                    Buy More
                </h3>
                <Link to="/products" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center hover:underline">
                    Explore More Products <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
            </div>

            <div
                ref={scrollRef}
                className={`flex space-x-4 pb-4 ${shouldAnimate ? 'overflow-hidden' : 'overflow-x-auto'}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{ scrollBehavior: 'auto' }} // Important for instant reset
            >
                {displayProducts.map((product, index) => {
                     const qty = product.min_order_quantity || 1;
                     const priceInfo = getPriceForQuantity(product, qty);
                     
                     // Use index in key because items are duplicated
                     return (
                        <Card key={`${product.id}-${index}`} className="flex-shrink-0 w-48 sm:w-56 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                             <div className="aspect-square w-full bg-slate-100 dark:bg-slate-900 relative overflow-hidden rounded-t-xl group">
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-110"
                                />
                             </div>
                             <CardContent className="p-3">
                                <h4 className="font-semibold text-sm line-clamp-1 text-slate-900 dark:text-slate-100" title={product.name}>
                                    {product.name}
                                </h4>
                                <p className="text-xs text-slate-500 mb-2 line-clamp-1">{product.brands?.name || 'Generic'}</p>
                                
                                <div className="flex items-center justify-between mt-3">
                                    <span className="font-bold text-sm text-blue-600">
                                        {priceInfo ? formatPrice(priceInfo.price) : 'N/A'}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => handleAddToCart(product)}
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                </div>
                             </CardContent>
                        </Card>
                     );
                })}
            </div>
        </div>
    );
};

export default BuyMoreCarousel;