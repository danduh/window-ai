#!/bin/bash

echo "🔍 MCP Inspector Test Script"
echo "This script will start the MCP Inspector to test your payment server"
echo ""

# Build the server first
echo "Building MCP server..."
npx nx build mcp

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🚀 Starting MCP Inspector..."
    echo "This will open a web interface to test your MCP server"
    echo ""
    
    # Use npx to run the inspector
    npx @modelcontextprotocol/inspector node dist/mcp/main.js
else
    echo "❌ Build failed!"
    exit 1
fi
