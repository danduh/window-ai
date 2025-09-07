#!/bin/bash

echo "🖥️  Starting MCP Client CLI..."
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

# Start the CLI client
node dist/mcp-client/cli.js
