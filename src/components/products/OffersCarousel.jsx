import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

const OffersCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const slideInterval = useRef(null);

  const fetchOffers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_offers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setOffers(data || []);
    } catch (err) {
      console.error("Failed to fetch offers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (slideInterval.current) {
        clearInterval(slideInterval.current);
    }
    if (offers.length > 1) {
        slideInterval.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % offers.length);
        }, 6000);
    }
  }, [offers.length]);


  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);
  
  useEffect(() => {
    resetTimer();
    return () => clearInterval(slideInterval.current);
  }, [offers, resetTimer]);


  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % offers.length);
    resetTimer();
  };
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + offers.length) % offers.length);
    resetTimer();
  };
  const goToSlide = (index) => {
    setCurrentIndex(index);
    resetTimer();
  }

  if (loading) {
    return (
      <div className="w-full h-[300px] md:h-[400px] mb-8 rounded-2xl overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
         <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (offers.length === 0) {
    return null; 
  }

  const currentOffer = offers[currentIndex];

  return (
    <div className="relative w-full h-[300px] md:h-[400px] mb-8 rounded-2xl overflow-hidden shadow-xl group bg-slate-900">
      <AnimatePresence initial={false}>
        <motion.div
            key={currentOffer.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10 z-10" />
            <img 
                className="w-full h-full object-cover" 
                alt={currentOffer.title} 
                src={currentOffer.image_url} 
                loading="lazy"
            />
            <div className="absolute inset-0 z-20 flex flex-col justify-center items-start p-8 md:p-16">
              <motion.h2 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg max-w-2xl"
              >
                {currentOffer.title}
              </motion.h2>
              {currentOffer.description && (
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-base md:text-lg text-white/90 mb-6 max-w-xl drop-shadow"
                  >
                    {currentOffer.description}
                  </motion.p>
              )}
              {currentOffer.button_text && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <Button 
                        size="lg" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold border-none shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                        onClick={() => {
                            if (currentOffer.button_link) {
                                navigate(currentOffer.button_link);
                            }
                        }}
                    >
                      {currentOffer.button_text} <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </motion.div>
              )}
            </div>
          </motion.div>
      </AnimatePresence>

      {offers.length > 1 && (
        <>
            <button 
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                aria-label="Previous slide"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                aria-label="Next slide"
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {offers.map((_, i) => (
                <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                    }`}
                />
                ))}
            </div>
        </>
      )}
    </div>
  );
};

export default OffersCarousel;