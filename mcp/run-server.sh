#!/bin/bash

# Build and run the Payment Demo MCP Server
echo "🏦 Building Payment Demo MCP Server..."
npx nx build mcp

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🚀 Starting MCP Server..."
    echo "Note: The server runs on stdio transport. Use an MCP client to interact with it."
    echo "Available tools: validate_balance, make_transfer, get_user_info, list_all_users"
    echo ""
    node dist/mcp/main.js
else
    echo "❌ Build failed!"
    exit 1
fi
