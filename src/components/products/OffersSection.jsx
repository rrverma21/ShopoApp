import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Tag, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { Skeleton } from '@/components/ui/skeleton';

const OffersSection = ({ limit = 6 }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('daily_offers')
          .select(`
            *,
            profiles (
              business_name,
              city
            )
          `)
          .gt('end_date', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        setOffers(data || []);
      } catch (error) {
        console.error('Error fetching offers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(limit)].map((_, i) => (
          <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return null; // Don't show anything if no active offers
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {offers.map((offer) => (
        <motion.div
          key={offer.id}
          whileHover={{ y: -5 }}
          className="relative"
        >
          <Card className="h-full overflow-hidden border-0 shadow-lg bg-white dark:bg-slate-900 group cursor-pointer"
                onClick={() => navigate(`/shop/${offer.user_id}`)}>
            <div className="relative h-40 overflow-hidden">
              {offer.images && offer.images[0] ? (
                <img 
                  src={offer.images[0]} 
                  alt={offer.product_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                  <Tag className="w-12 h-12 text-orange-300" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1">
                  {offer.discount_percentage ? `${offer.discount_percentage}% OFF` : 'DEAL'}
                </Badge>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-white text-xs font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Ends soon
                </p>
              </div>
            </div>

            <CardContent className="p-4">
              <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                {offer.product_name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold text-blue-600">₹{offer.discount_price}</span>
                <span className="text-sm text-slate-400 line-through">₹{offer.original_price}</span>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Seller</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                    {offer.profiles?.business_name}
                  </span>
                </div>
                <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 px-2 h-8">
                  View Shop <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default OffersSection;