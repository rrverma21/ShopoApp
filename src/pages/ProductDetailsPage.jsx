import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShoppingCart, Heart, Share2, ArrowLeft, Star } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const ProductDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          brand:brands(name),
          seller:profiles(business_name, id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.pricing_tiers?.[0]?.price || 0,
        image: product.image_url,
        quantity,
      });
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Product link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Product Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">The product you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/products')}>Back to Products</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const basePrice = product.pricing_tiers?.[0]?.price || 0;
  const discount = product.pricing_tiers?.[0]?.discount || 0;
  const finalPrice = basePrice - (basePrice * discount / 100);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <Helmet>
        <title>{product.name} - ShopoApp</title>
        <meta name="description" content={product.description || `Buy ${product.name} on ShopoApp`} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/products')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center min-h-[400px]">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="max-w-full max-h-96 object-contain"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p>No image available</p>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
                  <p className="text-slate-500 mt-1">SKU: {product.id}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={isFavorite ? 'text-red-500' : 'text-slate-400'}
                >
                  <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
              </div>

              {/* Badges */}
              <div className="flex gap-2 mt-3">
                {product.category && (
                  <Badge variant="secondary">{product.category.name}</Badge>
                )}
                {product.brand && (
                  <Badge variant="outline">{product.brand.name}</Badge>
                )}
                {product.is_splash_sale && (
                  <Badge className="bg-red-500">Splash Sale</Badge>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-blue-600">₹{finalPrice.toFixed(2)}</span>
                {discount > 0 && (
                  <>
                    <span className="text-lg text-slate-500 line-through">₹{basePrice.toFixed(2)}</span>
                    <Badge className="bg-green-500">{discount}% OFF</Badge>
                  </>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-2">Minimum Order: {product.min_order_quantity || 1} units</p>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
                <p className="text-slate-600">{product.description}</p>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Specifications</h3>
                <p className="text-slate-600">{product.specifications}</p>
              </div>
            )}

            {/* Seller Info */}
            {product.seller && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Seller Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-slate-900">{product.seller.business_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-slate-600">4.5 (120 reviews)</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quantity & Add to Cart */}
            <div className="flex gap-4">
              <div className="flex items-center border border-slate-300 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </Button>
                <span className="px-4 py-2 font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
              <Button
                onClick={handleAddToCart}
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;