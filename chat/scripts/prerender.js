const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { setTimeout } = require('node:timers/promises');

const routes = [
  '/',
  '/chat',
  '/tool-calling',
  '/summary',
  '/translate',
  '/writer'
];

const baseUrl = 'http://localhost:4200/window-ai';
const outputDir = path.join(__dirname, '../dist/chat');

async function prerender() {
  console.log('Starting pre-rendering process...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    for (const route of routes) {
      console.log(`Pre-rendering route: ${route}`);
      
      const page = await browser.newPage();
      
      // Set a reasonable viewport
      await page.setViewport({ width: 1200, height: 800 });
      
      // Navigate to the route
      const url = `${baseUrl}${route === '/' ? '' : route}`;
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 3000
      });
      
      // Wait for React to hydrate and content to load

      await setTimeout(1000);

      
      // Get the rendered HTML
      const html = await page.content();
      
      // Determine output file path
      const outputPath = route === '/' 
        ? path.join(outputDir, 'index.html')
        : path.join(outputDir, route.slice(1), 'index.html');
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Clean up the HTML for better SEO
      const cleanedHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
          // Keep JSON-LD structured data scripts
          if (match.includes('application/ld+json')) {
            return match;
          }
          // Keep essential scripts but remove others for initial load
          return '';
        })
        .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
        .replace(/\s+/g, ' ') // Minimize whitespace
        .trim();
      
      // Write the pre-rendered HTML
      fs.writeFileSync(outputPath, cleanedHtml, 'utf8');
      console.log(`✓ Pre-rendered: ${route} -> ${outputPath}`);
      
      await page.close();
    }
    
    console.log('✅ Pre-rendering completed successfully!');
    
  } catch (error) {
    console.error('❌ Pre-rendering failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Generate sitemap.xml
function generateSitemap() {
  console.log('Generating sitemap.xml...');
  
  const baseUrl = 'https://your-domain.com/window-ai';
  const currentDate = new Date().toISOString().split('T')[0];
  
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => {
  const url = route === '/' ? baseUrl : `${baseUrl}${route}`;
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
}).join('\n')}
</urlset>`;
  
  const sitemapPath = path.join(outputDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');
  console.log(`✓ Sitemap generated: ${sitemapPath}`);
}

// Generate robots.txt
function generateRobots() {
  console.log('Generating robots.txt...');
  
  const robotsContent = `User-agent: *
Allow: /

Sitemap: https://your-domain.com/window-ai/sitemap.xml`;
  
  const robotsPath = path.join(outputDir, 'robots.txt');
  fs.writeFileSync(robotsPath, robotsContent, 'utf8');
  console.log(`✓ Robots.txt generated: ${robotsPath}`);
}

if (require.main === module) {
  prerender()
    .then(() => {
      generateSitemap();
      generateRobots();
    })
    .catch(console.error);
}

module.exports = { prerender, generateSitemap, generateRobots };