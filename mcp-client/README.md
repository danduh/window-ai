# MCP Payment Client

This is a client application that connects to and uses the Payment MCP Server. It provides both a REST API and a CLI interface for interacting with the payment system.

## Features

- **REST API Server** - HTTP endpoints for payment operations
- **CLI Interface** - Interactive command-line client
- **Full MCP Integration** - Connects to payment MCP server via stdio transport
- **Error Handling** - Comprehensive error handling and validation
- **Graceful Shutdown** - Proper cleanup of MCP connections

## Quick Start

### 1. Start the API Server
```bash
./start-api.sh
```

The API will be available at `http://localhost:3001`

### 2. Start the CLI Client
```bash
./start-cli.sh
```

Interactive command-line interface for payment operations.

## API Endpoints

### GET `/`
Get API information and available endpoints.

### GET `/health`
Health check endpoint showing connection status.

### GET `/users`
List all users in the payment system.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_001",
      "email": "alice@example.com",
      "balance": 1500.50,
      "name": "Alice Johnson"
    }
  ]
}
```

### GET `/users/:userId`
Get information for a specific user.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_001",
    "email": "alice@example.com",
    "balance": 1500.50,
    "name": "Alice Johnson"
  }
}
```

### POST `/validate-balance`
Validate if a user has sufficient balance for a transaction.

**Request Body:**
```json
{
  "userId": "user_001",
  "requiredAmount": 200.00
}
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "currentBalance": 1500.50,
    "requiredAmount": 200.00,
    "message": "User Alice Johnson has sufficient balance"
  }
}
```

### POST `/transfer`
Transfer money between users.

**Request Body:**
```json
{
  "fromUserId": "user_001",
  "toUserEmail": "bob@example.com",
  "amount": 100.00
}
```

**Response:**
```json
{
  "success": true,
  "transfer": {
    "success": true,
    "transactionId": "TXN_1001_1234567890",
    "newBalance": 1400.50,
    "message": "Successfully transferred $100.00 from Alice Johnson to Bob Smith"
  }
}
```

### GET `/demo`
Run a comprehensive demo showing all payment operations.

## CLI Commands

When you run the CLI, you'll see an interactive menu:

1. **List all users** - Show all users and their balances
2. **Get user info** - Get detailed information for a specific user
3. **Validate balance** - Check if a user has sufficient funds
4. **Make transfer** - Transfer money between users
5. **Run full demo** - Execute a comprehensive demo
6. **Exit** - Disconnect and exit

## Example Usage

### Using curl to test the API:

```bash
# List all users
curl http://localhost:3001/users

# Get user info
curl http://localhost:3001/users/user_001

# Validate balance
curl -X POST http://localhost:3001/validate-balance \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_001", "requiredAmount": 200}'

# Make transfer
curl -X POST http://localhost:3001/transfer \
  -H "Content-Type: application/json" \
  -d '{"fromUserId": "user_001", "toUserEmail": "bob@example.com", "amount": 100}'

# Run demo
curl http://localhost:3001/demo
```

### Using the CLI:

```bash
./start-cli.sh
# Follow the interactive prompts
```

## Mock Data

The system uses the same mock data as the MCP server:

- **Alice Johnson** (`user_001`): $1,500.50 - alice@example.com
- **Bob Smith** (`user_002`): $750.25 - bob@example.com  
- **Charlie Brown** (`user_003`): $2,300.00 - charlie@example.com
- **Diana Prince** (`user_004`): $150.75 - diana@example.com
- **Eve Wilson** (`user_005`): $0.00 - eve@example.com

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   REST API      │    │   MCP Client     │    │   MCP Server    │
│   (Express)     │◄──►│   (SDK Client)   │◄──►│   (Payment)     │
│   Port 3001     │    │   (stdio)        │    │   (stdio)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                                              ▲
         │                                              │
         ▼                                              ▼
┌─────────────────┐                           ┌─────────────────┐
│   CLI Client    │                           │   Mock Payment  │
│   (Interactive) │                           │   Service       │
└─────────────────┘                           └─────────────────┘
```

## Error Handling

- **Connection Errors**: Automatic reconnection attempts
- **Validation Errors**: Clear error messages for invalid inputs
- **Business Logic Errors**: Proper handling of insufficient funds, etc.
- **Graceful Shutdown**: Clean disconnection from MCP server

## Development

### Build the client:
```bash
npx nx build mcp-client
```

### Run in development mode:
```bash
npx nx serve mcp-client
```

## Troubleshooting

### "Failed to connect to MCP server"
- Make sure the MCP server builds correctly: `npx nx build mcp`
- Check that the server path is correct in the client code

### "Port already in use"
- Change the port in `src/main.ts` or set the `PORT` environment variable
- Kill any existing processes: `lsof -ti:3001 | xargs kill`

### "Module not found"
- Install dependencies: `npm install`
- Build the project: `npx nx build mcp-client`

This client demonstrates how to build applications that integrate with MCP servers, providing both programmatic (API) and interactive (CLI) interfaces for the payment system.
