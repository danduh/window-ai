#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Mock DOM environment for server-side rendering
const { JSDOM } = require('jsdom');

// Create JSDOM instance
const dom = new JSDOM(
  '<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>',
  {
    url: 'https://windowai.danduh.me',
    pretendToBeVisual: false,
    resources: 'usable',
  },
);

// Set up global variables for React
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Routes to prerender
const routes = [
  { path: '/', filename: 'index.html' },
  { path: '/chat', filename: 'chat.html' },
  { path: '/tool-calling', filename: 'tool-calling.html' },
  { path: '/summary', filename: 'summary.html' },
  { path: '/translate', filename: 'translate.html' },
  { path: '/writer', filename: 'writer.html' },
];

// Build configuration
const distPath = path.join(__dirname, '../../dist/chat');
const templatePath = path.join(distPath, 'index.html');

async function prerenderRoutes() {
  console.log('Starting React pre-rendering process...');

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

      // Get SEO data for this route
      const seoData = getSEODataForRoute(route.path);

      // Create enhanced HTML with proper meta tags and structured data
      const enhancedHtml = createEnhancedHTML(
        templateHtml,
        seoData,
        route.path,
      );

      // Write the enhanced HTML file
      const outputPath = path.join(distPath, route.filename);
      fs.writeFileSync(outputPath, enhancedHtml);

      console.log(`✓ Generated ${route.filename}`);
    } catch (error) {
      console.error(`Error pre-rendering ${route.path}:`, error);
    }
  }

  // Create sitemap.xml
  createSitemap();

  // Create robots.txt
  createRobotsTxt();

  console.log('Pre-rendering completed!');
}

function getSEODataForRoute(routePath) {
  const seoConfigs = {
    '/': {
      title:
        'Chrome AI APIs - Built-in AI capabilities for modern web applications',
      description:
        "Explore Chrome's experimental AI APIs including Chat (Gemini Nano), Summarization, Translation, and Writer/Rewriter. Interactive demos and comprehensive documentation for developers.",
      keywords:
        'Chrome AI, Gemini Nano, AI APIs, web development, machine learning, browser AI, chat API, translation API, summarization API, writer API',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Chrome AI APIs Demo',
        description:
          "Interactive demos and documentation for Chrome's experimental AI APIs",
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Chrome Browser',
      },
    },
    '/chat': {
      title:
        'AI Chat - Interactive conversations with Gemini Nano | Chrome AI APIs',
      description:
        'Chat with Gemini Nano directly in your browser. Experience on-device AI conversations with streaming responses, system message configuration, and advanced settings.',
      keywords:
        'AI chat, Gemini Nano, conversational AI, browser AI, on-device AI, streaming chat, prompt API',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'AI Chat Demo',
        description: 'Interactive chat interface powered by Gemini Nano',
        about: {
          '@type': 'Thing',
          name: 'Gemini Nano AI Chat',
        },
      },
    },
    '/tool-calling': {
      title:
        'Tool Calling API - Function calling with Chrome AI | Chrome AI APIs',
      description:
        "Explore Chrome's Tool Calling API for function calling and structured interactions with AI. Learn how to integrate external tools and services with browser-based AI.",
      keywords:
        'tool calling, function calling, Chrome AI, API integration, structured AI, browser tools',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Tool Calling API Demo',
        description: 'Function calling and structured AI interactions',
      },
    },
    '/summary': {
      title:
        'Text Summarization API - AI-powered content summarization | Chrome AI APIs',
      description:
        "Generate intelligent summaries with Chrome's Summarization API. Multiple formats including key-points, TL;DR, headlines, and teasers with customizable length options.",
      keywords:
        'text summarization, AI summarization, content summarization, key points, TL;DR, headlines, browser AI',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Text Summarization Demo',
        description: 'AI-powered text summarization with multiple formats',
      },
    },
    '/translate': {
      title:
        'Translation & Language Detection APIs - Multi-language AI translation | Chrome AI APIs',
      description:
        'On-device language detection and translation between multiple language pairs. Features automatic language detection, streaming translation, and downloadable language packs.',
      keywords:
        'language translation, language detection, multi-language, on-device translation, browser translation, AI translation',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Translation API Demo',
        description: 'Multi-language translation and detection',
      },
    },
    '/writer': {
      title:
        'Writer & Rewriter APIs - AI-powered content creation | Chrome AI APIs',
      description:
        'AI-powered content creation and enhancement. Writer creates new content from prompts, while Rewriter transforms existing text with tone, format, and length adjustments.',
      keywords:
        'AI writing, content creation, text rewriting, writing assistant, content enhancement, AI writer, text generation',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Writer & Rewriter Demo',
        description: 'AI-powered content creation and enhancement',
      },
    },
  };

  return seoConfigs[routePath] || seoConfigs['/'];
}

function createEnhancedHTML(htmlTemplate, seoData, routePath) {
  const baseUrl = 'https://windowai.danduh.me';
  const fullUrl = `${baseUrl}${routePath}`;

  // Update title
  let html = htmlTemplate.replace(
    /<title>.*?<\/title>/,
    `<title>${seoData.title}</title>`,
  );

  // Create comprehensive meta tags
  const metaTags = `
    <!-- Primary Meta Tags -->
    <meta name="title" content="${seoData.title}">
    <meta name="description" content="${seoData.description}">
    <meta name="keywords" content="${seoData.keywords}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${fullUrl}">
    <meta property="og:title" content="${seoData.title}">
    <meta property="og:description" content="${seoData.description}">
    <meta property="og:site_name" content="Chrome AI APIs">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${fullUrl}">
    <meta property="twitter:title" content="${seoData.title}">
    <meta property="twitter:description" content="${seoData.description}">
    
    <!-- Additional SEO -->
    <link rel="canonical" href="${fullUrl}">
    <meta name="robots" content="index, follow">
    <meta name="language" content="English">
    <meta name="author" content="Chrome AI APIs Demo">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(seoData.structuredData, null, 2)}
    </script>
  `;

  // Inject meta tags before closing head tag
  html = html.replace('</head>', `${metaTags}</head>`);

  // Add preload hints for critical resources
  const preloadHints = `
    <link rel="preconnect" href="${baseUrl}">
    <link rel="dns-prefetch" href="${baseUrl}">
  `;

  html = html.replace('<head>', `<head>${preloadHints}`);

  return html;
}

function createSitemap() {
  const baseUrl = 'https://windowai.danduh.me';

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${routes
    .map(
      (route) => `
  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`,
    )
    .join('')}
</urlset>`;

  fs.writeFileSync(path.join(distPath, 'sitemap.xml'), sitemap);
  console.log('✓ Generated sitemap.xml');
}

function createRobotsTxt() {
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://your-domain.com/window-ai'
      : 'http://localhost:4200';

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;

  fs.writeFileSync(path.join(distPath, 'robots.txt'), robotsTxt);
  console.log('✓ Generated robots.txt');
}

// Install JSDOM if not available
try {
  require('jsdom');
} catch (e) {
  console.log('Installing jsdom...');
  require('child_process').execSync('npm install jsdom', { stdio: 'inherit' });
}

// Run the prerender process
prerenderRoutes().catch((error) => {
  console.error('Pre-rendering failed:', error);
  process.exit(1);
});
