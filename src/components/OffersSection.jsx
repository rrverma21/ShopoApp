import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Tag, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MOCK_OFFERS = [
  {
    id: 1,
    discount: '20% OFF',
    title: 'Summer Fresh Deals',
    desc: 'Get fresh groceries delivered in 30 mins.',
    coupon: 'SUMMER20',
    image: 'https://images.unsplash.com/photo-1641803216631-47d43eb4f35e?w=600&q=80',
    timeLeft: '12:45:00'
  },
  {
    id: 2,
    discount: 'FLAT ₹150',
    title: 'Electronics Sale',
    desc: 'Save big on mobile accessories and more.',
    coupon: 'ELEC150',
    image: 'https://images.unsplash.com/photo-1617469001581-20eb5ca99e7b?w=600&q=80',
    timeLeft: '05:30:00'
  },
  {
    id: 3,
    discount: 'BUY 1 GET 1',
    title: 'Weekend Bonanza',
    desc: 'Exclusive buy one get one free offers.',
    coupon: 'BOGO',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80',
    timeLeft: '48:00:00'
  },
  {
    id: 4,
    discount: '10% OFF',
    title: 'Local Artisans',
    desc: 'Support local craftsmen with discounts.',
    coupon: 'LOCAL10',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80',
    timeLeft: '24:00:00'
  },
  {
    id: 5,
    discount: 'FREE DELIVERY',
    title: 'Midnight Cravings',
    desc: 'Free delivery on all orders above ₹500.',
    coupon: 'FREEDEL',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
    timeLeft: '02:15:00'
  }
];

export default function OffersSection({ limit = 5 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const offers = MOCK_OFFERS.slice(0, limit);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % offers.length);
  }, [offers.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + offers.length) % offers.length);
  };

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, isHovered]);

  const getVisibleCards = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) return 3;
      if (window.innerWidth >= 768) return 2;
    }
    return 1;
  };

  return (
    <div className="w-full relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-xl font-bold hidden md:block text-slate-800 dark:text-slate-200">
          Special Offers & Deals
        </h3>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="icon" onClick={prevSlide} className="rounded-full h-10 w-10 border-slate-200 hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextSlide} className="rounded-full h-10 w-10 border-slate-200 hover:bg-slate-100">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden relative px-2 py-4">
        <motion.div 
          className="flex gap-6"
          animate={{ x: `calc(-${currentIndex * (100 / getVisibleCards())}% - ${currentIndex * 1.5}rem)` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {offers.map((offer) => (
            <motion.div 
              key={offer.id}
              className="relative min-w-[300px] w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] h-[200px] rounded-[18px] overflow-hidden shrink-0 group shadow-lg cursor-pointer bg-white"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <img 
                src={offer.image} 
                alt={offer.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/60 to-transparent p-[40px] flex flex-col justify-end">
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 font-bold px-3 py-1 text-sm shadow-md">
                    {offer.discount}
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="bg-black/50 backdrop-blur-md text-white border-white/20 font-medium px-3 py-1">
                    <Clock className="w-3 h-3 mr-1.5 inline" />
                    {offer.timeLeft}
                  </Badge>
                </div>
                
                <h4 className="text-white font-bold text-xl mb-1 drop-shadow-md truncate">{offer.title}</h4>
                <p className="text-slate-200 text-xs mb-3 line-clamp-1">{offer.desc}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                    <Tag className="w-3.5 h-3.5 text-yellow-300" />
                    <span className="text-white font-mono font-bold tracking-wider text-xs">{offer.coupon}</span>
                  </div>
                  <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold shadow-lg h-8 text-xs">
                    View Offer <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}