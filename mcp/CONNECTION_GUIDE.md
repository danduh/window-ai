# MCP Connection Guide for Workshop

## Quick Demo Setup (Recommended)

### Option 1: Claude Desktop (Best for Live Demo)

1. **Build the server:**
   ```bash
   cd /Users/danielos/dev/window-ai
   npx nx build mcp
   ```

2. **Configure Claude Desktop:**
   - Copy the contents of `claude-desktop-config.json` to:
     - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
     - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
     - **Linux:** `~/.config/Claude/claude_desktop_config.json`

3. **Restart Claude Desktop**

4. **Test with these prompts:**
   ```
   "List all users in the payment system"
   "Check if user_001 has $500 available"
   "Transfer $100 from user_001 to bob@example.com"
   "Show me Alice's user information"
   ```

### Option 2: MCP Inspector (Best for Development)

1. **Run the test script:**
   ```bash
   ./mcp/test-with-inspector.sh
   ```

2. **Open the web interface** that appears (usually http://localhost:3000)

3. **Test each tool** using the inspector UI

### Option 3: Direct Server Testing

1. **Start the server:**
   ```bash
   ./mcp/run-server.sh
   ```

2. **The server will run and wait for stdio input/output**

## Workshop Demo Flow

### Introduction (2 minutes)
- "This is an MCP server that provides financial tools"
- "MCP allows AI to safely interact with external services"
- "Let's see how it works..."

### Demo Steps (8 minutes)

1. **Show the tools:**
   ```
   "What payment tools do you have available?"
   ```

2. **List users:**
   ```
   "Show me all users in the payment system"
   ```

3. **Check balance:**
   ```
   "Does user_001 have enough money for a $200 purchase?"
   ```

4. **Successful transfer:**
   ```
   "Transfer $150 from user_001 to charlie@example.com"
   ```

5. **Failed transfer:**
   ```
   "Try to transfer $1000 from user_005 to alice@example.com"
   ```

6. **Show updated balances:**
   ```
   "Show me user_001's current information"
   ```

### Key Points to Highlight

✅ **Safety:** Balance validation prevents overdrafts
✅ **Structure:** Well-defined inputs/outputs
✅ **Error Handling:** Clear error messages
✅ **Async Operations:** Simulates real-world delays
✅ **Transaction IDs:** Audit trail for transfers

## Troubleshooting

### Common Issues:

1. **"Server not found"**
   - Make sure you built the project: `npx nx build mcp`
   - Check the path in the config file

2. **"Permission denied"**
   - Make sure scripts are executable: `chmod +x mcp/*.sh`

3. **"Module not found"**
   - Install dependencies: `npm install`

### Quick Test:
```bash
# Test if server starts
cd /Users/danielos/dev/window-ai
node dist/mcp/main.js < /dev/null
```

Should output: "🏦 Payment Demo MCP Server is running..."

## Alternative Demo: Direct API

If MCP setup fails, you can show the mock service directly:

```bash
cd /Users/danielos/dev/window-ai
npx tsx mcp/src/test.ts
```

This runs the payment service tests without MCP.

## Questions for Q&A

- "How does this compare to REST APIs?"
- "What about security and authentication?"
- "Can this work with real banking systems?"
- "How do you handle rate limiting?"
- "What about transaction rollbacks?"
