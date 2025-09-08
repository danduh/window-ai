import { useEffect } from 'react';
import { useSEO } from '../context/SEOContext';

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
}

export const useSEOData = (config: SEOConfig, path?: string) => {
  const { updateSEO } = useSEO();

  useEffect(() => {
    const baseUrl = window.location.origin;
    const currentPath = path || window.location.pathname;
    
    updateSEO({
      title: config.title,
      description: config.description,
      keywords: config.keywords,
      ogTitle: config.title,
      ogDescription: config.description,
      ogImage: config.ogImage ? `${baseUrl}${config.ogImage}` : undefined,
      canonicalUrl: `${baseUrl}${currentPath}`
    });
  }, [config, path, updateSEO]);
};

// SEO configurations for each page
export const seoConfigs = {
  home: {
    title: 'Chrome AI APIs - Built-in AI capabilities for modern web applications',
    description: 'Explore Chrome\'s experimental AI APIs including Chat (Gemini Nano), Summarization, Translation, and Writer/Rewriter. Interactive demos and comprehensive documentation for developers.',
    keywords: 'Chrome AI, Gemini Nano, AI APIs, web development, machine learning, browser AI, chat API, translation API, summarization API, writer API'
  },
  chat: {
    title: 'AI Chat - Interactive conversations with Gemini Nano | Chrome AI APIs',
    description: 'Chat with Gemini Nano directly in your browser. Experience on-device AI conversations with streaming responses, system message configuration, and advanced settings.',
    keywords: 'AI chat, Gemini Nano, conversational AI, browser AI, on-device AI, streaming chat, prompt API'
  },
  toolCalling: {
    title: 'Tool Calling API - Function calling with Chrome AI | Chrome AI APIs',
    description: 'Explore Chrome\'s Tool Calling API for function calling and structured interactions with AI. Learn how to integrate external tools and services with browser-based AI.',
    keywords: 'tool calling, function calling, Chrome AI, API integration, structured AI, browser tools'
  },
  summary: {
    title: 'Text Summarization API - AI-powered content summarization | Chrome AI APIs',
    description: 'Generate intelligent summaries with Chrome\'s Summarization API. Multiple formats including key-points, TL;DR, headlines, and teasers with customizable length options.',
    keywords: 'text summarization, AI summarization, content summarization, key points, TL;DR, headlines, browser AI'
  },
  translate: {
    title: 'Translation & Language Detection APIs - Multi-language AI translation | Chrome AI APIs',
    description: 'On-device language detection and translation between multiple language pairs. Features automatic language detection, streaming translation, and downloadable language packs.',
    keywords: 'language translation, language detection, multi-language, on-device translation, browser translation, AI translation'
  },
  writer: {
    title: 'Writer & Rewriter APIs - AI-powered content creation | Chrome AI APIs',
    description: 'AI-powered content creation and enhancement. Writer creates new content from prompts, while Rewriter transforms existing text with tone, format, and length adjustments.',
    keywords: 'AI writing, content creation, text rewriting, writing assistant, content enhancement, AI writer, text generation'
  }
} as const;