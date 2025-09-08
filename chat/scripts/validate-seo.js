#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../../dist/chat');

console.log('🔍 Validating SEO Implementation...\n');

// Check if all required files exist
const requiredFiles = [
  'index.html',
  'chat.html', 
  'tool-calling.html',
  'summary.html',
  'translate.html',
  'writer.html',
  'sitemap.xml',
  'robots.txt'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - exists`);
  } else {
    console.log(`❌ ${file} - missing`);
    allFilesExist = false;
  }
});

console.log('\n📊 SEO Validation Results:');

// Validate HTML files have proper meta tags
const htmlFiles = requiredFiles.filter(f => f.endsWith('.html'));
htmlFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`\n🔍 Analyzing ${file}:`);
    
    // Check for essential meta tags
    const checks = [
      { name: 'Title tag', pattern: /<title>.*<\/title>/ },
      { name: 'Meta description', pattern: /<meta name="description"/ },
      { name: 'Meta keywords', pattern: /<meta name="keywords"/ },
      { name: 'Open Graph title', pattern: /<meta property="og:title"/ },
      { name: 'Open Graph description', pattern: /<meta property="og:description"/ },
      { name: 'Twitter card', pattern: /<meta name="twitter:card"/ },
      { name: 'Canonical URL', pattern: /<link rel="canonical"/ },
      { name: 'Structured data', pattern: /<script type="application\/ld\+json">/ }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name}`);
      }
    });
    
    // Extract and show title
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    if (titleMatch) {
      console.log(`  📝 Title: "${titleMatch[1]}"`);
    }
    
    // Extract and show description
    const descMatch = content.match(/<meta name="description" content="(.*?)"/);
    if (descMatch) {
      console.log(`  📝 Description: "${descMatch[1].substring(0, 100)}..."`);
    }
  }
});

// Validate sitemap.xml
console.log('\n🗺️  Sitemap Validation:');
const sitemapPath = path.join(distPath, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  const urlCount = (sitemapContent.match(/<url>/g) || []).length;
  console.log(`✅ Sitemap contains ${urlCount} URLs`);
  
  // Check if all routes are included
  const routes = ['/', '/chat', '/tool-calling', '/summary', '/translate', '/writer'];
  routes.forEach(route => {
    if (sitemapContent.includes(`<loc>http://localhost:4200${route}</loc>`)) {
      console.log(`  ✅ Route ${route} included`);
    } else {
      console.log(`  ❌ Route ${route} missing`);
    }
  });
} else {
  console.log('❌ sitemap.xml not found');
}

// Validate robots.txt
console.log('\n🤖 Robots.txt Validation:');
const robotsPath = path.join(distPath, 'robots.txt');
if (fs.existsSync(robotsPath)) {
  const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
  console.log('✅ robots.txt exists');
  if (robotsContent.includes('Sitemap:')) {
    console.log('  ✅ Sitemap reference included');
  } else {
    console.log('  ❌ Sitemap reference missing');
  }
} else {
  console.log('❌ robots.txt not found');
}

console.log('\n🎉 SEO Validation Complete!');

if (allFilesExist) {
  console.log('\n✅ All required files are present');
  console.log('🚀 Your application is ready for SEO-optimized deployment!');
} else {
  console.log('\n❌ Some required files are missing. Please run the build process again.');
}