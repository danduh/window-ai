import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { googleAnalytics, GAEvent } from '../services/GoogleAnalyticsService';

/**
 * Hook for Google Analytics integration
 */
export const useGoogleAnalytics = () => {
  const location = useLocation();

  // Track page views automatically when route changes
  useEffect(() => {
    googleAnalytics.trackPageView({
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title
    });
  }, [location]);

  // Memoized tracking functions
  const trackEvent = useCallback((event: GAEvent) => {
    googleAnalytics.trackEvent(event);
  }, []);

  const trackChatEvent = useCallback((action: string, details: Record<string, any> = {}) => {
    googleAnalytics.trackChatEvent(action, details);
  }, []);

  const trackAIToolUsage = useCallback((toolName: string, action: string, details: Record<string, any> = {}) => {
    googleAnalytics.trackAIToolUsage(toolName, action, details);
  }, []);

  const trackUserInteraction = useCallback((action: string, element: string, details: Record<string, any> = {}) => {
    googleAnalytics.trackUserInteraction(action, element, details);
  }, []);

  const trackError = useCallback((error: string, details: Record<string, any> = {}) => {
    googleAnalytics.trackError(error, details);
  }, []);

  const trackPerformance = useCallback((metric: string, value: number, details: Record<string, any> = {}) => {
    googleAnalytics.trackPerformance(metric, value, details);
  }, []);

  return {
    trackEvent,
    trackChatEvent,
    trackAIToolUsage,
    trackUserInteraction,
    trackError,
    trackPerformance
  };
};