# Payment Demo MCP Server - Workshop Guide

## Quick Start

1. **Build and run the server:**
   ```bash
   cd /Users/danielos/dev/window-ai
   ./mcp/run-server.sh
   ```

2. **The server provides 4 tools:**
   - `validate_balance` - Check if user has sufficient funds
   - `make_transfer` - Transfer money between users
   - `get_user_info` - Get user details (helper)
   - `list_all_users` - List all users (helper)

## Workshop Demo Script

### Step 1: List All Users
First, let's see who's in our system:

**Tool:** `list_all_users`
**Parameters:** `{}`

**Expected Output:**
```json
{
  "tool": "list_all_users",
  "result": [
    {"id": "user_001", "email": "alice@example.com", "balance": 1500.50, "name": "Alice Johnson"},
    {"id": "user_002", "email": "bob@example.com", "balance": 750.25, "name": "Bob Smith"},
    {"id": "user_003", "email": "charlie@example.com", "balance": 2300.00, "name": "Charlie Brown"},
    {"id": "user_004", "email": "diana@example.com", "balance": 150.75, "name": "Diana Prince"},
    {"id": "user_005", "email": "eve@example.com", "balance": 0.00, "name": "Eve Wilson"}
  ],
  "summary": "📋 Found 5 users in the system"
}
```

### Step 2: Check Alice's Balance
Let's see if Alice can afford a $200 purchase:

**Tool:** `validate_balance`
**Parameters:**
```json
{
  "userId": "user_001",
  "requiredAmount": 200
}
```

**Expected Output:**
```json
{
  "tool": "validate_balance",
  "result": {
    "isValid": true,
    "currentBalance": 1500.50,
    "requiredAmount": 200,
    "message": "User Alice Johnson has sufficient balance"
  },
  "summary": "✅ Balance validation passed: $1500.50 available"
}
```

### Step 3: Successful Transfer
Alice sends $200 to Bob:

**Tool:** `make_transfer`
**Parameters:**
```json
{
  "fromUserId": "user_001",
  "toUserEmail": "bob@example.com", 
  "amount": 200
}
```

**Expected Output:**
```json
{
  "tool": "make_transfer",
  "result": {
    "success": true,
    "transactionId": "TXN_1001_[timestamp]",
    "newBalance": 1300.50,
    "message": "Successfully transferred $200.00 from Alice Johnson to Bob Smith"
  },
  "summary": "✅ Transfer completed: $200.00 sent successfully"
}
```

### Step 4: Failed Transfer (Insufficient Funds)
Eve tries to send $100 but has $0 balance:

**Tool:** `make_transfer`
**Parameters:**
```json
{
  "fromUserId": "user_005",
  "toUserEmail": "alice@example.com",
  "amount": 100
}
```

**Expected Output:**
```json
{
  "tool": "make_transfer",
  "result": {
    "success": false,
    "message": "Transfer cancelled: Insufficient funds. Available: $0.00, Required: $100.00"
  },
  "summary": "❌ Transfer failed: Insufficient balance"
}
```

### Step 5: Check User Info
Get detailed info about a specific user:

**Tool:** `get_user_info`
**Parameters:**
```json
{
  "userId": "user_002"
}
```

**Expected Output:**
```json
{
  "tool": "get_user_info",
  "result": {
    "id": "user_002",
    "email": "bob@example.com",
    "balance": 950.25,
    "name": "Bob Smith"
  },
  "summary": "👤 User found: Bob Smith (bob@example.com) - Balance: $950.25"
}
```

## Key Points for Workshop

1. **Balance Validation**: The system always checks balance before transfers
2. **Async Operations**: All operations simulate real-world delays
3. **Error Handling**: Comprehensive validation and error messages
4. **Transaction IDs**: Every successful transfer gets a unique ID
5. **User-Friendly Output**: Each response includes a summary for easy understanding

## Error Scenarios to Demonstrate

- Transfer to non-existent email
- Transfer with invalid user ID  
- Transfer negative amounts
- Self-transfer attempts

This MCP server demonstrates how AI systems can safely interact with financial services through structured, validated tools!
