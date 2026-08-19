import React from 'react';
import { motion } from 'framer-motion';

const SplashScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
    >
      <motion.img
        src="https://horizons-cdn.hostinger.com/3c38fd60-a24a-4d78-a3d8-58678655dafd/3f0e1abebe5a7b8adc7d62db0e2a2b16.png"
        alt="App Logo"
        className="w-48 h-48 object-contain"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
      />
    </motion.div>
  );
};

export default SplashScreen;