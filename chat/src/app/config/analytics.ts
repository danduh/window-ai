// Google Analytics Configuration
export const ANALYTICS_CONFIG = {
  // Google Analytics Measurement ID
  GA_MEASUREMENT_ID: 'G-ZC3N8B4VGB',
  
  // Enable/disable analytics based on environment
  ENABLED: typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : true,
  
  // Debug mode for development
  DEBUG: typeof process !== 'undefined' ? process.env.NODE_ENV === 'development' : false,
  
  // Default tracking options
  DEFAULT_CONFIG: {
    // Send page views automatically
    send_page_view: true,
    
    // Anonymize IP addresses
    anonymize_ip: true,
    
    // Enhanced ecommerce
    allow_enhanced_conversions: false,
    
    // Custom parameters
    custom_map: {
      'dimension1': 'user_type',
      'dimension2': 'ai_model',
      'dimension3': 'feature_used'
    }
  },
  
  // Event categories
  EVENT_CATEGORIES: {
    CHAT: 'Chat',
    AI_TOOLS: 'AI_Tools',
    USER_INTERACTION: 'User_Interaction',
    NAVIGATION: 'Navigation',
    ERRORS: 'Errors',
    PERFORMANCE: 'Performance'
  },
  
  // Common event actions
  EVENT_ACTIONS: {
    // Chat actions
    MESSAGE_SENT: 'message_sent',
    RESPONSE_RECEIVED: 'response_received',
    CHAT_CLEARED: 'chat_cleared',
    
    // Tool actions
    TOOL_USED: 'tool_used',
    TOOL_ERROR: 'tool_error',
    
    // Navigation actions
    PAGE_VIEW: 'page_view',
    LINK_CLICK: 'link_click',
    
    // User interactions
    BUTTON_CLICK: 'button_click',
    SETTINGS_TOGGLE: 'settings_toggle',
    
    // Errors
    ERROR_OCCURRED: 'error_occurred',
    
    // Performance
    LOAD_TIME: 'load_time',
    API_RESPONSE_TIME: 'api_response_time'
  }
};

export default ANALYTICS_CONFIG;