import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const FeaturePageLayout = ({ 
  title, 
  description, 
  heroImage, 
  inlineImage,
  inlineImageAlt,
  benefits = [], 
  howItWorks = [], 
  features = [], 
  ctaText = "Get Started Now" 
}) => {
  const navigate = useNavigate();

  const handleBackToFeatures = () => {
    const scrollToFeatures = () => {
      const element = document.getElementById('features-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (window.location.pathname === '/retailer-tools') {
      scrollToFeatures();
    } else {
      navigate('/retailer-tools');
      setTimeout(scrollToFeatures, 150);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt={title} 
            className="w-full h-full object-cover opacity-20 dark:opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/90 to-slate-50 dark:to-slate-900"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center md:text-left">
          <Button 
            variant="ghost" 
            className="mb-8 text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={handleBackToFeatures}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Features
          </Button>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto md:mx-0"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {title}
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-2xl leading-relaxed mx-auto md:mx-0">
              {description}
            </p>
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-14 rounded-full text-lg shadow-lg shadow-blue-900/20"
              onClick={() => navigate('/signup')}
            >
              {ctaText}
            </Button>
          </motion.div>

          {inlineImage && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="feature-image-wrapper mt-12 md:mt-16"
            >
              <img 
                src={inlineImage} 
                alt={inlineImageAlt || title} 
                className="feature-hero-image"
              />
            </motion.div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      {benefits.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Key Benefits
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Discover how this feature can transform your daily operations and boost your bottom line.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {benefits.map((benefit, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-start space-x-4"
                >
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-200 font-medium text-lg leading-tight">
                    {benefit}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      {howItWorks.length > 0 && (
        <section className="py-16 md:py-24 bg-slate-100 dark:bg-slate-800/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-16 text-center">
              How It Works
            </h2>
            
            <div className="max-w-4xl mx-auto relative">
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-blue-200 dark:bg-blue-900/50 -translate-x-1/2 hidden md:block"></div>
              
              <div className="space-y-12">
                {howItWorks.map((step, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                  >
                    <div className="flex-1 w-full md:text-right">
                      {idx % 2 === 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 ml-12 md:ml-0 md:mr-8 relative">
                          <div className="md:hidden absolute -left-12 top-6 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                            {idx + 1}
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                          <p className="text-slate-600 dark:text-slate-400">{step.desc}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white hidden md:flex items-center justify-center font-bold text-xl relative z-10 shrink-0 shadow-lg shadow-blue-500/30 border-4 border-slate-100 dark:border-slate-900">
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 w-full">
                      {idx % 2 !== 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 ml-12 md:ml-8 relative">
                          <div className="md:hidden absolute -left-12 top-6 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                            {idx + 1}
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                          <p className="text-slate-600 dark:text-slate-400">{step.desc}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Additional Features List */}
      {features.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-12 text-center">
              More Powerful Features
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, idx) => (
                <div key={idx} className="flex gap-4 p-6 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg shrink-0">
                    <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h4>
                    <p className="text-slate-600 dark:text-slate-400">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="py-20 bg-blue-600 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to upgrade your retail business?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">Join thousands of modern retailers using our platform to grow their sales and manage operations effortlessly.</p>
          <Button 
            size="lg" 
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 h-14 rounded-full text-lg font-bold"
            onClick={() => navigate('/signup')}
          >
            Start Your 30-Day Free Trial
          </Button>
        </div>
      </section>
    </div>
  );
};

export default FeaturePageLayout;