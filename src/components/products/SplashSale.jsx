import React, { useState, useEffect, useRef } from 'react';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent } from '@/components/ui/card';
    import { toast } from '@/components/ui/use-toast';
    import { useCart } from '@/contexts/CartContext';
    import ImageZoom from '@/components/ImageZoom';
    import { FileImage as ImageIcon, Zap } from 'lucide-react';
    import { formatPrice, getPriceForQuantity, calculateDiscountPercentage } from '@/lib/utils';

    const SplashSale = ({ products }) => {
      const { addToCart, cartItems } = useCart();
      const scrollRef = useRef(null);
      const requestRef = useRef();
      const isHoveringRef = useRef(false);

      const duplicatedProducts = products.length > 0 ? [...products, ...products] : [];

      const animateScroll = () => {
        if (scrollRef.current && !isHoveringRef.current) {
          scrollRef.current.scrollLeft += 0.5;
          if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth / 2) {
            scrollRef.current.scrollLeft = 0;
          }
        }
        requestRef.current = requestAnimationFrame(animateScroll);
      };

      useEffect(() => {
        if (products.length > 5) {
          if (requestRef.current) {
              cancelAnimationFrame(requestRef.current);
          }
          requestRef.current = requestAnimationFrame(animateScroll);
        }
        
        return () => {
          if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
          }
        };
      }, [products]);

      const handleMouseEnter = () => {
        isHoveringRef.current = true;
      };
      
      const handleMouseLeave = () => {
        isHoveringRef.current = false;
      };

      const handleAddToCart = (product) => {
        if (!product.seller_id) {
          toast({
            title: "Cannot Add to Cart",
            description: "This product cannot be purchased at the moment.",
            variant: "destructive",
          });
          return;
        }

        if (cartItems.length > 0 && cartItems[0].seller_id !== product.seller_id) {
          toast({
            title: "Multiple Sellers",
            description: "You can only order from one seller at a time. Please clear your cart first.",
            variant: "destructive",
          });
          return;
        }

        const quantity = product.min_order_quantity || 1;
        const priceInfo = getPriceForQuantity(product, quantity);
        
        if (!priceInfo) {
          toast({ title: "Error", description: "Could not determine price for the selected quantity.", variant: "destructive" });
          return;
        }

        const productWithPrice = { ...product, price: priceInfo.price };

        addToCart(productWithPrice, quantity);
        toast({
          title: "Added to Cart",
          description: `${quantity} x ${product.name} added to cart.`,
        });
      };

      if (!products || products.length === 0) {
        return null;
      }

      return (
        <div className="mb-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-effect rounded-none w-full p-4 md:p-6"
          >
            <div className="flex items-center mb-4">
              <Zap className="text-yellow-400 w-6 h-6 mr-2" />
              <h2 className="text-2xl font-bold tracking-tight gradient-text">Splash Sale</h2>
            </div>
            <div 
              ref={scrollRef}
              className="flex overflow-x-auto space-x-4 no-scrollbar"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {(products.length > 5 ? duplicatedProducts : products).map((product, index) => {
                  const quantity = product.min_order_quantity || 1;
                  const priceInfo = getPriceForQuantity(product, quantity);
                  const displayPrice = priceInfo ? priceInfo.price : null;
                  const displayMrp = priceInfo ? priceInfo.mrp : null;
                  const discount = calculateDiscountPercentage(displayMrp, displayPrice);

                  return (
                    <Card key={`${product.id}-${index}`} className="flex-shrink-0 w-48 bg-white/5 dark:bg-black/10 backdrop-blur-sm rounded-lg overflow-hidden group">
                      <div className="relative">
                          <div className="aspect-square w-full bg-white dark:bg-slate-800 flex items-center justify-center">
                              {product.image_url ? (
                                  <ImageZoom alt={product.name} className="w-full h-full object-cover" src={product.image_url} />
                              ) : (
                                  <ImageIcon className="w-12 h-12 text-slate-400" />
                              )}
                          </div>
                          {discount > 0 && (
                            <div className="absolute top-1 left-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {discount}% OFF
                            </div>
                          )}
                      </div>
                      <CardContent className="p-2">
                        <h3 className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">{product.name}</h3>
                        <div className="flex items-baseline justify-between mt-1">
                          <div>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {displayPrice !== null ? formatPrice(displayPrice) : 'N/A'}
                              </span>
                              {displayMrp && displayMrp > displayPrice && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 line-through ml-1">
                                    {formatPrice(displayMrp)}
                                </span>
                              )}
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleAddToCart(product)}
                          className="btn-primary w-full h-8 text-xs mt-2"
                          disabled={!product.seller_id}
                        >
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  )
              })}
            </div>
          </motion.div>
        </div>
      );
    };

    export default SplashSale;