#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Routes to prerender
const routes = [
  { path: '/', filename: 'index.html' },
  { path: '/chat', filename: 'chat.html' },
  { path: '/tool-calling', filename: 'tool-calling.html' },
  { path: '/summary', filename: 'summary.html' },
  { path: '/translate', filename: 'translate.html' },
  { path: '/writer', filename: 'writer.html' }
];

// Build configuration
const distPath = path.join(__dirname, '../../dist/chat');
const templatePath = path.join(distPath, 'index.html');

async function prerenderRoutes() {
  console.log('Starting pre-rendering process...');
  
  // Ensure dist directory exists
  if (!fs.existsSync(distPath)) {
    console.error('Dist directory not found. Please run the build first.');
    process.exit(1);
  }
  
  // Read the template HTML file
  if (!fs.existsSync(templatePath)) {
    console.error('Template index.html not found in dist directory.');
    process.exit(1);
  }
  
  const templateHtml = fs.readFileSync(templatePath, 'utf-8');
  
  // Generate HTML for each route
  for (const route of routes) {
    try {
      console.log(`Pre-rendering ${route.path}...`);
      
      const seoData = getSEODataForRoute(route.path);
      const enhancedHtml = injectSEOData(templateHtml, seoData);
      
      // Write the enhanced HTML file
      const outputPath = path.join(distPath, route.filename);
      fs.writeFileSync(outputPath, enhancedHtml);
      
      console.log(`✓ Generated ${route.filename}`);
    } catch (error) {
      console.error(`Error pre-rendering ${route.path}:`, error);
    }
  }
  
  console.log('Pre-rendering completed!');
}

function getSEODataForRoute(routePath) {
  const seoConfigs = {
    '/': {
      title: 'Chrome AI APIs - Built-in AI capabilities for modern web applications',
      description: 'Explore Chrome\'s experimental AI APIs including Chat (Gemini Nano), Summarization, Translation, and Writer/Rewriter. Interactive demos and comprehensive documentation for developers.',
      keywords: 'Chrome AI, Gemini Nano, AI APIs, web development, machine learning, browser AI, chat API, translation API, summarization API, writer API'
    },
    '/chat': {
      title: 'AI Chat - Interactive conversations with Gemini Nano | Chrome AI APIs',
      description: 'Chat with Gemini Nano directly in your browser. Experience on-device AI conversations with streaming responses, system message configuration, and advanced settings.',
      keywords: 'AI chat, Gemini Nano, conversational AI, browser AI, on-device AI, streaming chat, prompt API'
    },
    '/tool-calling': {
      title: 'Tool Calling API - Function calling with Chrome AI | Chrome AI APIs',
      description: 'Explore Chrome\'s Tool Calling API for function calling and structured interactions with AI. Learn how to integrate external tools and services with browser-based AI.',
      keywords: 'tool calling, function calling, Chrome AI, API integration, structured AI, browser tools'
    },
    '/summary': {
      title: 'Text Summarization API - AI-powered content summarization | Chrome AI APIs',
      description: 'Generate intelligent summaries with Chrome\'s Summarization API. Multiple formats including key-points, TL;DR, headlines, and teasers with customizable length options.',
      keywords: 'text summarization, AI summarization, content summarization, key points, TL;DR, headlines, browser AI'
    },
    '/translate': {
      title: 'Translation & Language Detection APIs - Multi-language AI translation | Chrome AI APIs',
      description: 'On-device language detection and translation between multiple language pairs. Features automatic language detection, streaming translation, and downloadable language packs.',
      keywords: 'language translation, language detection, multi-language, on-device translation, browser translation, AI translation'
    },
    '/writer': {
      title: 'Writer & Rewriter APIs - AI-powered content creation | Chrome AI APIs',
      description: 'AI-powered content creation and enhancement. Writer creates new content from prompts, while Rewriter transforms existing text with tone, format, and length adjustments.',
      keywords: 'AI writing, content creation, text rewriting, writing assistant, content enhancement, AI writer, text generation'
    }
  };
  
  return seoConfigs[routePath] || seoConfigs['/'];
}

function injectSEOData(htmlTemplate, seoData) {
  const baseUrl = process.env.NODE_ENV === 'production' ? 'https://your-domain.com/window-ai' : 'http://localhost:4200';
  
  // Update title
  let html = htmlTemplate.replace(/<title>.*?<\/title>/, `<title>${seoData.title}</title>`);
  
  // Add meta tags in the head section
  const metaTags = `
    <meta name="description" content="${seoData.description}">
    <meta name="keywords" content="${seoData.keywords}">
    <meta property="og:title" content="${seoData.title}">
    <meta property="og:description" content="${seoData.description}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${seoData.title}">
    <meta name="twitter:description" content="${seoData.description}">
  `;
  
  // Inject meta tags before closing head tag
  html = html.replace('</head>', `${metaTags}</head>`);
  
  return html;
}

// Run the prerender process
prerenderRoutes().catch(error => {
  console.error('Pre-rendering failed:', error);
  process.exit(1);
});