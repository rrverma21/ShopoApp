import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SEO = ({ title, description, image }) => {
  const { pathname } = useLocation();
  const siteUrl = 'https://shopoapp.com';
  const canonicalUrl = `${siteUrl}${pathname}`;
  const defaultTitle = 'ShopoApp - Retailer & Delivery Platform';
  const defaultDescription = 'Connecting retailers, suppliers, and delivery partners in one seamless platform.';
  const defaultImage = 'https://shopoapp.com/og-image.jpg'; // Placeholder

  const metaTitle = title ? `${title} | ShopoApp` : defaultTitle;
  const metaDescription = description || defaultDescription;
  const metaImage = image || defaultImage;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={metaTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={metaImage} />
    </Helmet>
  );
};

export default SEO;