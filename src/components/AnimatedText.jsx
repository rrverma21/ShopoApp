import React from 'react';
import { motion } from 'framer-motion';

const AnimatedText = ({ text, el: Wrapper = 'p', className, stagger = 0.05 }) => {
  const words = text.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: stagger, delayChildren: 0.2 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <Wrapper className={className}>
      <motion.span
        variants={container}
        initial="hidden"
        animate="visible"
        style={{ display: 'inline-block' }}
      >
        {words.map((word, index) => (
          <motion.span
            variants={child}
            style={{ display: 'inline-block', marginRight: '0.25em' }}
            key={index}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </Wrapper>
  );
};

export default AnimatedText;