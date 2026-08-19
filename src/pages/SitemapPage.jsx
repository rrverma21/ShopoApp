import React, { useEffect } from 'react';
import { generateSitemapXML } from '@/lib/sitemapGenerator';

const SitemapPage = () => {
  useEffect(() => {
    document.title = "ShopoApp | Smart POS Billing, Inventory & Taxation Software";
    
    // This component renders the raw XML string. 
    // In a real static hosting scenario, you'd ideally generate this file at build time.
    const xml = generateSitemapXML();
    
    // Create a blob and serve it
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    
    // Redirect or display instructions
    window.location.href = url;
  }, []);

  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-bold mb-4">Generating Sitemap...</h1>
      <p>If you are not redirected, please check your popup blocker.</p>
    </div>
  );
};

export default SitemapPage;