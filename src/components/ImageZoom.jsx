import React from 'react';
import { motion } from 'framer-motion';

const ImageZoom = ({ src, alt, className }) => {
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    const target = e.currentTarget.querySelector('img');
    if (target) {
      target.style.transformOrigin = `${x * 100}% ${y * 100}%`;
    }
  };

  return (
    <motion.div
      className={`relative overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
    >
      <motion.img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 ease-in-out group-hover:scale-[2]"
        loading="lazy"
      />
    </motion.div>
  );
};

export default ImageZoom;