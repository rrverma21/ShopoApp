import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, desc, gradient, shadow, path, delay = 0 }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8 }}
      onClick={() => navigate(path)}
      className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl hover:shadow-2xl hover:shadow-blue-900/5 dark:hover:shadow-blue-500/10 transition-all duration-300 border border-slate-100 dark:border-slate-700 overflow-hidden cursor-pointer"
    >
      {/* Gradient Blob on Hover */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 rounded-full transition-opacity duration-500 blur-2xl`}></div>
      
      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 md:mb-8 shadow-lg ${shadow} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
      </div>
      
      <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">
        {title}
      </h3>
      
      <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8 text-sm md:text-base">
        {desc}
      </p>

      <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
        Explore Feature <ArrowRight className="w-4 h-4 ml-1" />
      </div>
    </motion.div>
  );
};

export default FeatureCard;