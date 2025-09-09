import React, { createContext, useContext, useEffect, ReactNode } from 'react';

interface SEOData {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

interface SEOContextType {
  updateSEO: (seoData: SEOData) => void;
}

const SEOContext = createContext<SEOContextType | undefined>(undefined);

export const useSEO = () => {
  const context = useContext(SEOContext);
  if (!context) {
    throw new Error('useSEO must be used within a SEOProvider');
  }
  return context;
};

interface SEOProviderProps {
  children: ReactNode;
}

export const SEOProvider: React.FC<SEOProviderProps> = ({ children }) => {
  const updateSEO = (seoData: SEOData) => {
    // Update document title
    document.title = seoData.title;

    // Update meta tags
    updateMetaTag('description', seoData.description);
    if (seoData.keywords) updateMetaTag('keywords', seoData.keywords);
    
    // Update Open Graph tags
    updateMetaTag('og:title', seoData.ogTitle || seoData.title, 'property');
    updateMetaTag('og:description', seoData.ogDescription || seoData.description, 'property');
    updateMetaTag('og:type', 'website', 'property');
    if (seoData.ogImage) updateMetaTag('og:image', seoData.ogImage, 'property');
    
    // Update Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', seoData.ogTitle || seoData.title);
    updateMetaTag('twitter:description', seoData.ogDescription || seoData.description);
    
    // Update canonical URL
    if (seoData.canonicalUrl) {
      updateLinkTag('canonical', seoData.canonicalUrl);
    }
  };

  const updateMetaTag = (name: string, content: string, attribute: string = 'name') => {
    let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
    if (element) {
      element.content = content;
    } else {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      element.content = content;
      document.head.appendChild(element);
    }
  };

  const updateLinkTag = (rel: string, href: string) => {
    let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
    if (element) {
      element.href = href;
    } else {
      element = document.createElement('link');
      element.rel = rel;
      element.href = href;
      document.head.appendChild(element);
    }
  };

  return (
    <SEOContext.Provider value={{ updateSEO }}>
      {children}
    </SEOContext.Provider>
  );
};