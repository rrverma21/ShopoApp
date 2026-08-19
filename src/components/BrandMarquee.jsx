import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const BrandMarquee = ({ brands }) => {
  const marqueeRef = useRef(null);

  if (!brands || brands.length === 0) {
    return null;
  }

  const duplicatedBrands = [...brands, ...brands];

  const marqueeVariants = {
    animate: {
      x: ['0%', '-50%'],
      transition: {
        x: {
          repeat: Infinity,
          repeatType: "loop",
          duration: 30,
          ease: "linear",
        },
      },
    },
  };

  return (
    <div className="relative w-full overflow-x-hidden py-12">
      <div className="absolute inset-0 bg-white/50 z-0"></div>
      <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-slate-50 to-transparent z-10"></div>
      <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-slate-50 to-transparent z-10"></div>
      <motion.div
        ref={marqueeRef}
        className="flex"
        variants={marqueeVariants}
        animate="animate"
      >
        {duplicatedBrands.map((brand, index) => (
          <div key={index} className="flex-shrink-0 mx-8 flex items-center justify-center" style={{ width: '150px' }}>
            <img
              src={brand.image_url}
              alt={brand.name}
              className="max-h-16 w-auto object-contain transition-transform duration-300 hover:scale-110"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default BrandMarquee;