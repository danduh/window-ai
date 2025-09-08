import React from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { getSEOForRoute, generateStructuredData, SEOMetadata } from '../utils/seo';

interface SEOHeadProps {
  customSEO?: Partial<SEOMetadata>;
}

const SEOHead: React.FC<SEOHeadProps> = ({ customSEO = {} }) => {
  const location = useLocation();
  const seoData = { ...getSEOForRoute(location.pathname), ...customSEO };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{seoData.title}</title>
      <meta name="description" content={seoData.description} />
      {seoData.keywords && <meta name="keywords" content={seoData.keywords} />}
      
      {/* Canonical URL */}
      {seoData.canonicalUrl && <link rel="canonical" href={seoData.canonicalUrl + location.pathname.replace(/^\/window-ai/, '')} />}
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={seoData.ogTitle || seoData.title} />
      <meta property="og:description" content={seoData.ogDescription || seoData.description} />
      <meta property="og:type" content="website" />
      {seoData.ogUrl && <meta property="og:url" content={seoData.ogUrl + location.pathname.replace(/^\/window-ai/, '')} />}
      {seoData.ogImage && <meta property="og:image" content={seoData.ogImage} />}
      <meta property="og:site_name" content="Chrome AI APIs Demo" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={seoData.twitterCard || 'summary_large_image'} />
      <meta name="twitter:title" content={seoData.ogTitle || seoData.title} />
      <meta name="twitter:description" content={seoData.ogDescription || seoData.description} />
      {seoData.ogImage && <meta name="twitter:image" content={seoData.ogImage} />}
      
      {/* Additional Meta Tags for Better SEO */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="author" content="Chrome AI APIs Demo" />
      <meta name="language" content="en" />
      <meta name="theme-color" content="#6366f1" />
      
      {/* Structured Data */}
      {seoData.structuredData && (
        <script type="application/ld+json">
          {generateStructuredData(seoData)}
        </script>
      )}
      
      {/* Preconnect to improve performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    </Helmet>
  );
};

export default SEOHead;