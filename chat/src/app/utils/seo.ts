export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  canonicalUrl?: string;
  structuredData?: object;
}

export const DEFAULT_SEO: SEOMetadata = {
  title: 'AI Tools - Chrome Built-in AI APIs Demo',
  description: 'Explore Chrome\'s experimental built-in AI capabilities including chat, summarization, translation, and writing assistance powered by Gemini Nano.',
  keywords: 'Chrome AI, Gemini Nano, AI APIs, Chat, Summarization, Translation, Writing Assistant, On-device AI',
  ogTitle: 'AI Tools - Chrome Built-in AI APIs Demo',
  ogDescription: 'Interactive demo showcasing Chrome\'s experimental AI features including conversational AI, text summarization, language translation, and AI-powered writing tools.',
  ogImage: '/window-ai/og-image.png',
  ogUrl: 'https://your-domain.com/window-ai/',
  twitterCard: 'summary_large_image',
  canonicalUrl: 'https://your-domain.com/window-ai/',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'AI Tools - Chrome Built-in AI APIs',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Chrome Browser',
    description: 'Interactive demo application showcasing Chrome\'s experimental built-in AI capabilities',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  }
};

export const PAGE_SEO: Record<string, SEOMetadata> = {
  '/': {
    title: 'Chrome AI APIs - Built-in AI Tools Demo',
    description: 'Discover Chrome\'s experimental built-in AI capabilities. Try conversational AI, text summarization, language translation, and AI-powered writing tools directly in your browser.',
    keywords: 'Chrome AI APIs, Gemini Nano, built-in AI, on-device AI, browser AI, experimental features',
    ogTitle: 'Chrome AI APIs - Built-in AI Tools Demo',
    ogDescription: 'Interactive demo showcasing Chrome\'s experimental AI features powered by Gemini Nano',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Chrome AI APIs Demo',
      applicationCategory: 'DeveloperApplication',
      description: 'Interactive demo application showcasing Chrome\'s experimental built-in AI capabilities',
      featureList: [
        'Conversational AI Chat',
        'Text Summarization',
        'Language Translation',
        'AI Writing Assistant'
      ]
    }
  },
  '/chat': {
    title: 'AI Chat - Chrome Prompt API Demo | Gemini Nano',
    description: 'Experience conversational AI powered by Chrome\'s built-in Prompt API and Gemini Nano. Interactive chat with streaming responses, customizable settings, and session management.',
    keywords: 'AI chat, Chrome Prompt API, Gemini Nano, conversational AI, streaming chat, on-device AI',
    ogTitle: 'AI Chat - Chrome Prompt API Demo',
    ogDescription: 'Interactive AI chat powered by Chrome\'s built-in Prompt API and Gemini Nano with streaming responses',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'AI Chat - Chrome Prompt API',
      applicationCategory: 'ChatApplication',
      description: 'Interactive conversational AI chat using Chrome\'s built-in Prompt API',
      featureList: [
        'Streaming responses',
        'Customizable temperature settings',
        'System message configuration',
        'Session management'
      ]
    }
  },
  '/tool-calling': {
    title: 'Tool Calling API Demo - Chrome AI Function Calling',
    description: 'Explore Chrome\'s experimental Tool Calling API for AI function execution. Interactive examples and documentation for advanced AI interactions.',
    keywords: 'Tool Calling API, Chrome AI, function calling, AI tools, advanced AI interactions',
    ogTitle: 'Tool Calling API Demo - Chrome AI',
    ogDescription: 'Interactive demo of Chrome\'s experimental Tool Calling API for AI function execution'
  },
  '/summary': {
    title: 'Text Summarization - Chrome Summarization API Demo',
    description: 'Intelligent text summarization using Chrome\'s built-in Summarization API. Multiple formats including key-points, TL;DR, headlines, and teasers with customizable length.',
    keywords: 'text summarization, Chrome Summarization API, AI summary, key points, TL;DR, content summarization',
    ogTitle: 'Text Summarization - Chrome AI Demo',
    ogDescription: 'Intelligent text summarization with multiple formats using Chrome\'s built-in AI',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Text Summarization - Chrome AI',
      applicationCategory: 'ProductivityApplication',
      description: 'Text summarization tool using Chrome\'s built-in Summarization API',
      featureList: [
        'Key-points format',
        'TL;DR format',
        'Headlines format',
        'Teasers format',
        'Customizable length'
      ]
    }
  },
  '/translate': {
    title: 'Language Translation - Chrome Translation API Demo',
    description: 'On-device language translation and detection using Chrome\'s built-in Translation API. Support for multiple language pairs with downloadable language packs.',
    keywords: 'language translation, Chrome Translation API, language detection, on-device translation, multilingual',
    ogTitle: 'Language Translation - Chrome AI Demo',
    ogDescription: 'On-device language translation and detection using Chrome\'s built-in AI',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Language Translation - Chrome AI',
      applicationCategory: 'UtilityApplication',
      description: 'Language translation and detection tool using Chrome\'s built-in Translation API',
      featureList: [
        'Automatic language detection',
        'Multiple language pairs',
        'On-device processing',
        'Downloadable language packs'
      ]
    }
  },
  '/writer': {
    title: 'AI Writing Assistant - Chrome Writer & Rewriter API Demo',
    description: 'AI-powered content creation and enhancement using Chrome\'s Writer and Rewriter APIs. Create new content from prompts or transform existing text with tone and format adjustments.',
    keywords: 'AI writing, Chrome Writer API, Rewriter API, content creation, text enhancement, AI writing assistant',
    ogTitle: 'AI Writing Assistant - Chrome AI Demo',
    ogDescription: 'AI-powered content creation and text enhancement using Chrome\'s built-in AI',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'AI Writing Assistant - Chrome AI',
      applicationCategory: 'ProductivityApplication',
      description: 'AI-powered writing and rewriting tool using Chrome\'s built-in APIs',
      featureList: [
        'Content creation from prompts',
        'Text rewriting and enhancement',
        'Tone adjustments',
        'Format transformations',
        'Length modifications'
      ]
    }
  }
};

export const getSEOForRoute = (pathname: string): SEOMetadata => {
  // Remove basename and normalize path
  const normalizedPath = pathname.replace(/^\/window-ai/, '') || '/';
  return { ...DEFAULT_SEO, ...PAGE_SEO[normalizedPath] };
};

export const generateStructuredData = (seoData: SEOMetadata): string => {
  if (!seoData.structuredData) return '';
  return JSON.stringify(seoData.structuredData, null, 2);
};