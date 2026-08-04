import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

export const AnalyticsTracker: React.FC = () => {
  const location = useLocation();

  // Load and inject custom Tracking and Chat widgets scripts on mount
  useEffect(() => {
    const fetchAndInjectScript = async () => {
      try {
        // 1. Inject Visitor Tracking
        const { data, error } = await supabase
          .from('supertour_settings')
          .select('value')
          .eq('key', 'visitor_tracking_script')
          .maybeSingle();

        if (!error && data && data.value && data.value.trim() !== '') {
          const existing = document.getElementById('supertour-visitor-tracking');
          if (!existing) {
            const container = document.createElement('div');
            container.innerHTML = data.value;
            const scripts = container.querySelectorAll('script');
            
            scripts.forEach(script => {
              const newScript = document.createElement('script');
              Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
              });
              if (script.src) {
                newScript.src = script.src;
                newScript.async = true;
              } else {
                newScript.textContent = script.textContent;
              }
              newScript.id = 'supertour-visitor-tracking';
              document.head.appendChild(newScript);
            });
          }
        }

        // 2. Inject Anychat script
        const { data: anychatData, error: anychatError } = await supabase
          .from('supertour_settings')
          .select('value')
          .eq('key', 'anychat_script')
          .maybeSingle();

        if (!anychatError && anychatData && anychatData.value && anychatData.value.trim() !== '') {
          const existingAnychat = document.getElementById('supertour-anychat');
          if (!existingAnychat) {
            const container = document.createElement('div');
            container.innerHTML = anychatData.value;
            const scripts = container.querySelectorAll('script');
            
            scripts.forEach(script => {
              const newScript = document.createElement('script');
              Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
              });
              if (script.src) {
                newScript.src = script.src;
                newScript.async = true;
              } else {
                newScript.textContent = script.textContent;
              }
              newScript.id = 'supertour-anychat';
              document.body.appendChild(newScript);
            });
          }
        }
      } catch (err) {
        console.warn('Could not load custom scripts from Supabase:', err);
      }
    };

    fetchAndInjectScript();
  }, []);

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

    // 5. Trigger standard location change events for SPA-aware tracking scripts
    try {
      window.dispatchEvent(new Event('popstate'));
      window.dispatchEvent(new Event('locationchange'));
    } catch (e) {
      // Silently handle any browser dispatch errors
    }

  }, [location]);

  return null; // This is a tracker component, it does not render visual UI
};

