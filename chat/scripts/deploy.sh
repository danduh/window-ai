#!/bin/bash

# SEO-Optimized Build and Deploy Script for Chrome AI Chat App
# This script builds the React app with pre-rendering for better SEO

set -e  # Exit on any error

echo "🚀 Starting SEO-optimized build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DIST_DIR="../dist/chat"
S3_BUCKET="${S3_BUCKET:-your-s3-bucket-name}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-your-distribution-id}"

echo -e "${BLUE}📦 Building React application...${NC}"
cd ..
npm run build:chat:prod

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Pre-rendering pages for SEO...${NC}"
npm run prerender:chat

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Pre-rendering completed successfully${NC}"
else
    echo -e "${RED}❌ Pre-rendering failed${NC}"
    exit 1
fi

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}❌ Dist directory not found: $DIST_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Generated files:${NC}"
ls -la "$DIST_DIR"

# Optional: Deploy to S3 if AWS CLI is configured
if command -v aws &> /dev/null && [ "$S3_BUCKET" != "your-s3-bucket-name" ]; then
    echo -e "${YELLOW}☁️  Deploying to S3...${NC}"
    
    # Sync files to S3 with proper cache headers
    aws s3 sync "$DIST_DIR" "s3://$S3_BUCKET/window-ai/" \
        --delete \
        --cache-control "public,max-age=31536000" \
        --exclude "*.html" \
        --exclude "sitemap.xml" \
        --exclude "robots.txt"
    
    # Upload HTML files with shorter cache
    aws s3 sync "$DIST_DIR" "s3://$S3_BUCKET/window-ai/" \
        --cache-control "public,max-age=3600" \
        --include "*.html" \
        --include "sitemap.xml" \
        --include "robots.txt"
    
    echo -e "${GREEN}✅ Files uploaded to S3${NC}"
    
    # Invalidate CloudFront cache if distribution ID is provided
    if [ "$CLOUDFRONT_DISTRIBUTION_ID" != "your-distribution-id" ]; then
        echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
        aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --paths "/window-ai/*"
        echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping S3 deployment (AWS CLI not configured or bucket not set)${NC}"
fi

echo -e "${GREEN}🎉 SEO-optimized build completed successfully!${NC}"
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "  1. Upload the contents of $DIST_DIR to your S3 bucket"
echo -e "  2. Configure CloudFront with the provided cloudfront-config.json"
echo -e "  3. Set up proper DNS and SSL certificates"
echo -e "  4. Submit sitemap.xml to Google Search Console"
echo ""
echo -e "${BLUE}🔍 SEO Files Generated:${NC}"
echo -e "  • Pre-rendered HTML files for all routes"
echo -e "  • sitemap.xml for search engines"
echo -e "  • robots.txt for crawler instructions"
echo -e "  • Structured data in each HTML file"
echo -e "  • Optimized meta tags for social sharing"