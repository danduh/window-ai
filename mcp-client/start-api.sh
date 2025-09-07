#!/bin/bash

echo "🚀 Starting MCP Client API Server..."
echo ""

# Build both MCP server and client
echo "🔨 Building MCP server..."
npx nx build mcp

if [ $? -ne 0 ]; then
    echo "❌ Failed to build MCP server"
    exit 1
fi

echo "🔨 Building MCP client..."
npx nx build mcp-client

if [ $? -ne 0 ]; then
    echo "❌ Failed to build MCP client"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "🚀 Starting API server on http://localhost:3001..."
echo "📖 The server will automatically connect to the MCP payment server"
echo ""

# Start the client API server
node dist/mcp-client/main.js
