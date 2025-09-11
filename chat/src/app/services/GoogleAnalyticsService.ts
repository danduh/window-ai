// Google Analytics Service for tracking events and page views
import { ANALYTICS_CONFIG } from '../config/analytics';

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

export interface GAEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export interface GAPageView {
  page_title: string;
  page_location: string;
  page_path: string;
}

class GoogleAnalyticsService {
  private readonly GA_MEASUREMENT_ID = ANALYTICS_CONFIG.GA_MEASUREMENT_ID;
  private readonly isEnabled = ANALYTICS_CONFIG.ENABLED;
  private readonly isDebug = ANALYTICS_CONFIG.DEBUG;
  private isInitialized = false;

  constructor() {
    this.checkInitialization();
  }

  private checkInitialization(): void {
    // Check if gtag is available
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      this.isInitialized = true;
    } else if (typeof window !== 'undefined') {
      // Retry after a short delay
      setTimeout(() => this.checkInitialization(), 100);
    }
  }

  /**
   * Track a page view
   */
  public trackPageView(pageData: Partial<GAPageView> = {}): void {
    if (!this.isEnabled) {
      if (this.isDebug) {
        console.log('GA Debug - Page View:', pageData);
      }
      return;
    }

    if (!this.isInitialized || typeof window === 'undefined') {
      console.warn('Google Analytics not initialized');
      return;
    }

    const pageView: GAPageView = {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      ...pageData
    };

    window.gtag('config', this.GA_MEASUREMENT_ID, {
      ...ANALYTICS_CONFIG.DEFAULT_CONFIG,
      ...pageView
    });
  }

  /**
   * Track a custom event
   */
  public trackEvent(event: GAEvent): void {
    if (!this.isEnabled) {
      if (this.isDebug) {
        console.log('GA Debug - Event:', event);
      }
      return;
    }

    if (!this.isInitialized || typeof window === 'undefined') {
      console.warn('Google Analytics not initialized');
      return;
    }

    window.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      ...event.custom_parameters
    });
  }

  /**
   * Track chat-specific events
   */
  public trackChatEvent(action: string, details: Record<string, any> = {}): void {
    this.trackEvent({
      action,
      category: 'Chat',
      label: details.model || 'unknown',
      custom_parameters: {
        chat_type: details.type || 'general',
        message_length: details.messageLength || 0,
        response_time: details.responseTime || 0,
        ...details
      }
    });
  }

  /**
   * Track AI tool usage
   */
  public trackAIToolUsage(toolName: string, action: string, details: Record<string, any> = {}): void {
    this.trackEvent({
      action,
      category: 'AI_Tools',
      label: toolName,
      custom_parameters: {
        tool_name: toolName,
        input_length: details.inputLength || 0,
        processing_time: details.processingTime || 0,
        ...details
      }
    });
  }

  /**
   * Track user interactions
   */
  public trackUserInteraction(action: string, element: string, details: Record<string, any> = {}): void {
    this.trackEvent({
      action,
      category: 'User_Interaction',
      label: element,
      custom_parameters: details
    });
  }

  /**
   * Track errors
   */
  public trackError(error: string, details: Record<string, any> = {}): void {
    this.trackEvent({
      action: 'error',
      category: 'Errors',
      label: error,
      custom_parameters: {
        error_message: error,
        ...details
      }
    });
  }

  /**
   * Track performance metrics
   */
  public trackPerformance(metric: string, value: number, details: Record<string, any> = {}): void {
    this.trackEvent({
      action: 'performance_metric',
      category: 'Performance',
      label: metric,
      value,
      custom_parameters: details
    });
  }
}

// Export a singleton instance
export const googleAnalytics = new GoogleAnalyticsService();
export default GoogleAnalyticsService;