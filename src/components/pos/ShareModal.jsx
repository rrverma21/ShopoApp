import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ShareModal = ({ isOpen, onClose, product, shopId }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!product) return null;

  const productUrl = `${window.location.origin}/shop/${shopId}/product/${product.id}`;
  
  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const handleWhatsAppShare = () => {
    const message = `${product.name} - ${productUrl}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleFacebookShare = () => {
    const encodedUrl = encodeURIComponent(productUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
  };

  const handleTwitterShare = () => {
    const tweetText = truncateText(`Check out ${product.name}`, 240);
    const encodedText = encodeURIComponent(tweetText);
    const encodedUrl = encodeURIComponent(productUrl);
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank');
  };

  const handleLinkedInShare = () => {
    const encodedUrl = encodeURIComponent(productUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Product link copied to clipboard.",
        duration: 2500,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      ),
      onClick: handleWhatsAppShare,
      className: 'share-btn-whatsapp',
      ariaLabel: 'Share on WhatsApp'
    },
    {
      name: 'Facebook',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
        </svg>
      ),
      onClick: handleFacebookShare,
      className: 'share-btn-facebook',
      ariaLabel: 'Share on Facebook'
    },
    {
      name: 'X',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      onClick: handleTwitterShare,
      className: 'share-btn-twitter',
      ariaLabel: 'Share on X (Twitter)'
    },
    {
      name: 'LinkedIn',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      onClick: handleLinkedInShare,
      className: 'share-btn-linkedin',
      ariaLabel: 'Share on LinkedIn'
    },
    {
      name: copied ? 'Copied!' : 'Copy Link',
      icon: copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />,
      onClick: handleCopyLink,
      className: copied ? 'share-btn-copy-success' : 'share-btn-copy',
      ariaLabel: 'Copy product link'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="share-modal-container pointer-events-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-modal-title"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm border border-slate-200 dark:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label="Close share modal"
                type="button"
              >
                <X size={18} className="text-slate-600 dark:text-slate-300" />
              </button>

              {/* Content */}
              <div className="flex flex-col items-center pt-6 pb-5 px-5">
                {/* Product Thumbnail */}
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-slate-100 dark:bg-slate-800 mb-4 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                      <Share2 size={32} />
                    </div>
                  )}
                </div>

                {/* Product Name */}
                <h2 
                  id="share-modal-title"
                  className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-1 max-w-xs line-clamp-2"
                >
                  {product.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Share this product
                </p>

                {/* Share Options */}
                <div className="grid grid-cols-5 gap-3 w-full max-w-md">
                  {shareOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={option.onClick}
                      className={cn(
                        "share-option-btn",
                        option.className
                      )}
                      aria-label={option.ariaLabel}
                      type="button"
                      tabIndex={0}
                    >
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mb-1.5 transition-transform duration-200 hover:scale-105 active:scale-95">
                        {option.icon}
                      </div>
                      <span className="text-[10px] md:text-xs font-medium">
                        {option.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShareModal;