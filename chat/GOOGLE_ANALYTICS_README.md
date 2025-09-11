# Google Analytics Implementation

This document describes the Google Analytics 4 (GA4) implementation for the Chrome AI APIs chat application.

## Overview

The application now includes comprehensive Google Analytics tracking with the measurement ID `G-ZC3N8B4VGB`. The implementation includes:

- **Page view tracking** - Automatically tracks page visits and route changes
- **Chat interaction tracking** - Tracks message sending, responses, and errors
- **AI tool usage tracking** - Tracks usage of Summary, Translation, and Writer tools
- **User interaction tracking** - Tracks button clicks, settings changes, and navigation
- **Error tracking** - Tracks and reports application errors
- **Performance tracking** - Tracks API response times and processing metrics

## Implementation Details

### 1. Core Components

#### Google Analytics Script (`index.html`)
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZC3N8B4VGB"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ZC3N8B4VGB', {
    page_title: document.title,
    page_location: window.location.href
  });
</script>
```

#### GoogleAnalyticsService (`src/app/services/GoogleAnalyticsService.ts`)
- Main service class for handling all analytics tracking
- Provides methods for tracking different types of events
- Includes environment-based configuration and debug mode

#### useGoogleAnalytics Hook (`src/app/hooks/useGoogleAnalytics.ts`)
- React hook for easy integration with components
- Automatically tracks page views on route changes
- Provides convenient methods for event tracking

#### Analytics Configuration (`src/app/config/analytics.ts`)
- Centralized configuration for GA settings
- Environment-based enabling/disabling
- Event categories and action constants

### 2. Tracked Events

#### Chat Events
- **message_sent**: When user sends a message
- **response_received**: When AI responds
- **chat_cleared**: When chat is cleared

#### AI Tool Usage
- **summarize_start/success**: Summary tool usage
- **translate_start/success**: Translation tool usage
- **writer_start/success**: Writer/Rewriter tool usage

#### User Interactions
- **navigation_click**: Menu navigation clicks
- **external_link_click**: Social media and external links
- **toggle_settings**: Settings panel toggles
- **menu_toggle**: Mobile menu toggles

#### Error Tracking
- **chat_error**: Chat-related errors
- **summarization_error**: Summary tool errors
- **translation_error**: Translation errors
- **writer_error**: Writer tool errors

#### Performance Metrics
- **api_response_time**: AI API response times
- **processing_time**: Tool processing times

### 3. Event Properties

Events include relevant contextual data:

```typescript
// Chat events
{
  messageLength: number,
  useStream: boolean,
  temperature: number,
  hasSystemMessage: boolean,
  responseTime?: number
}

// AI tool events
{
  inputLength: number,
  processingTime: number,
  toolName: string,
  useStreaming?: boolean,
  type?: string,
  format?: string
}

// User interaction events
{
  element: string,
  opened?: boolean,
  device?: 'desktop' | 'mobile'
}
```

### 4. Environment Configuration

Analytics are configured to:
- **Production**: Fully enabled with all tracking
- **Development**: Disabled by default, with debug logging available
- **Debug mode**: Console logging of all GA events for development

```typescript
export const ANALYTICS_CONFIG = {
  GA_MEASUREMENT_ID: 'G-ZC3N8B4VGB',
  ENABLED: process.env.NODE_ENV === 'production',
  DEBUG: process.env.NODE_ENV === 'development',
  // ... other config
};
```

## Usage Examples

### Basic Event Tracking
```typescript
import { useGoogleAnalytics } from '../hooks/useGoogleAnalytics';

const { trackUserInteraction, trackError } = useGoogleAnalytics();

// Track button click
trackUserInteraction('button_click', 'submit_button');

// Track error
trackError('api_error', { endpoint: '/chat', status: 500 });
```

### Chat Event Tracking
```typescript
const { trackChatEvent } = useGoogleAnalytics();

// Track message sent
trackChatEvent('message_sent', {
  messageLength: message.length,
  useStream: true,
  temperature: 0.8
});
```

### AI Tool Usage Tracking
```typescript
const { trackAIToolUsage } = useGoogleAnalytics();

// Track tool usage
trackAIToolUsage('summarizer', 'summarize_start', {
  inputLength: text.length,
  type: 'key-points',
  format: 'markdown'
});
```

## Data Privacy

The implementation includes privacy-friendly features:
- **IP anonymization** enabled
- **No personal data** collection
- **Environment-based controls** for development/testing
- **Consent-friendly** implementation (can be easily extended with consent management)

## Monitoring and Analysis

### Key Metrics to Monitor

1. **User Engagement**
   - Page views and session duration
   - Feature usage patterns
   - Navigation flow

2. **AI Tool Performance**
   - Usage frequency by tool
   - Success/error rates
   - Processing times

3. **User Experience**
   - Error rates and types
   - Performance metrics
   - User interaction patterns

### Custom Dimensions

The implementation supports custom dimensions for:
- User type classification
- AI model usage
- Feature utilization

## Future Enhancements

Potential improvements could include:
- **Enhanced ecommerce tracking** for premium features
- **User journey analysis** with custom events
- **A/B testing integration** for feature experiments
- **Real-time analytics dashboard** for monitoring
- **Consent management integration** for GDPR compliance

## Troubleshooting

### Debug Mode
Enable debug mode in development to see GA events in console:
```typescript
// In analytics.ts
DEBUG: true
```

### Verification
1. Check browser network tab for GA requests
2. Use Google Analytics Debugger extension
3. Monitor real-time events in GA4 dashboard
4. Check console for debug logs in development mode

## Support

For questions or issues with the analytics implementation:
1. Check the GA4 documentation
2. Review the service and hook implementations
3. Test in debug mode for troubleshooting
4. Monitor GA4 dashboard for data validation