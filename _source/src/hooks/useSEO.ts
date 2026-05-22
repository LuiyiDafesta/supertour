import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  canonicalPath?: string;
}

export const useSEO = ({
  title,
  description,
  ogImage,
  ogType = 'website',
  canonicalPath
}: SEOProps) => {
  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title.includes('SuperTourChannel') 
      ? title 
      : `${title} | SuperTourChannel`;
    document.title = formattedTitle;

    // Helper to update or create meta tags
    const updateMetaTag = (attr: string, value: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${value}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, value);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to update or create link tags
    const updateLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    const currentOrigin = window.location.origin;
    const currentUrl = window.location.href;

    // 2. Update Description
    const defaultDesc = 'SuperTourChannel: reviví, compartí y descargá las fotos grupales e individuales de tu viaje de egresados de primaria a Mar del Plata y Villa Carlos Paz.';
    const finalDesc = description || defaultDesc;
    updateMetaTag('name', 'description', finalDesc);

    // 3. Update Canonical Link
    const finalCanonical = canonicalPath 
      ? `${currentOrigin}${canonicalPath}` 
      : currentUrl;
    updateLinkTag('canonical', finalCanonical);

    // 4. Update Open Graph Tags
    updateMetaTag('property', 'og:title', formattedTitle);
    updateMetaTag('property', 'og:description', finalDesc);
    updateMetaTag('property', 'og:type', ogType);
    updateMetaTag('property', 'og:url', finalUrlForOG(canonicalPath, currentUrl, currentOrigin));
    
    const finalImage = ogImage 
      ? (ogImage.startsWith('http') ? ogImage : `${currentOrigin}${ogImage}`)
      : `${currentOrigin}/st-logo-og.png`;
    
    updateMetaTag('property', 'og:image', finalImage);
    updateMetaTag('property', 'og:image:width', '512');
    updateMetaTag('property', 'og:image:height', '512');
    updateMetaTag('property', 'og:image:type', 'image/png');

    // 5. Update Twitter Tags
    updateMetaTag('name', 'twitter:title', formattedTitle);
    updateMetaTag('name', 'twitter:description', finalDesc);
    updateMetaTag('name', 'twitter:image', finalImage);
    updateMetaTag('name', 'twitter:url', finalUrlForOG(canonicalPath, currentUrl, currentOrigin));

  }, [title, description, ogImage, ogType, canonicalPath]);
};

// Helper function to resolve final URL safely
const finalUrlForOG = (canonicalPath?: string, currentUrl?: string, origin?: string): string => {
  if (canonicalPath) {
    return `${origin}${canonicalPath}`;
  }
  return currentUrl || '';
};
