import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

export const AnalyticsTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    const currentUrl = window.location.href;
    const currentTitle = document.title;

    // 1. Console Log Tracking for easy development verification and debug audibility
    console.log(
      `%c[SuperTour Analytics]%c Page View Tracked: %c${fullPath}%c - Title: "${currentTitle}"`,
      'color: #FACC15; font-weight: bold;',
      'color: #AAAAAA;',
      'color: #FFFFFF; font-weight: bold; background: #222222; padding: 2px 6px; rounded: 4px;',
      'color: #AAAAAA;'
    );

    // 2. Google Analytics Tracking (gtag.js)
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: fullPath,
        page_location: currentUrl,
        page_title: currentTitle
      });
    }

    // 3. Facebook Pixel Tracking (fbevents.js)
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }

    // 4. Reset Scroll Position to top upon page navigation
    window.scrollTo({
      top: 0,
      behavior: 'instant' as ScrollBehavior // Keep it instant so loading feels prompt and immediate
    });

  }, [location]);

  return null; // This is a tracker component, it does not render visual UI
};
