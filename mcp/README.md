# Payment Demo MCP Server

This is a Model Context Protocol (MCP) server demonstrating a payment system for workshop purposes. It provides tools for balance validation and money transfers with mock data.

## Features

- **Balance Validation**: Check if a user has sufficient funds for a transaction
- **Money Transfer**: Transfer money between users with automatic balance validation
- **User Management**: Helper tools to view user information and list all users

## Mock Data

The service includes 5 mock users with different balance amounts:
- Alice Johnson (`user_001`): $1,500.50
- Bob Smith (`user_002`): $750.25
- Charlie Brown (`user_003`): $2,300.00
- Diana Prince (`user_004`): $150.75
- Eve Wilson (`user_005`): $0.00

## Available Tools

### 1. `validate_balance`
Validates if a user has sufficient balance for a transaction.

**Parameters:**
- `userId` (string): The unique identifier of the user
- `requiredAmount` (number): The amount of money needed for the transaction

**Example:**
```json
{
  "userId": "user_001",
  "requiredAmount": 100.00
}
```

### 2. `make_transfer`
Transfers money from one user to another. Automatically validates balance before processing.

**Parameters:**
- `fromUserId` (string): The unique identifier of the sender
- `toUserEmail` (string): The email address of the recipient
- `amount` (number): The amount of money to transfer

**Example:**
```json
{
  "fromUserId": "user_001",
  "toUserEmail": "bob@example.com",
  "amount": 250.00
}
```

### 3. `get_user_info` (Demo Helper)
Gets user information by user ID.

**Parameters:**
- `userId` (string): The unique identifier of the user

### 4. `list_all_users` (Demo Helper)
Lists all users in the system for demo purposes.

**Parameters:** None

## Running the Server

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run the MCP server:
   ```bash
   npm start
   ```

The server runs on stdio transport and communicates via standard input/output.

## Workshop Demo Scenarios

### Scenario 1: Successful Transfer
1. Check Alice's balance: `validate_balance` with `userId: "user_001"`, `requiredAmount: 100`
2. Transfer money: `make_transfer` from `user_001` to `bob@example.com` with `amount: 100`
3. Verify the transfer completed successfully

### Scenario 2: Insufficient Funds
1. Try to transfer more than available: `make_transfer` from `user_005` (Eve, $0 balance) to any user
2. Show how the system prevents overdrafts

### Scenario 3: User Not Found
1. Try operations with invalid user IDs to demonstrate error handling

## Technical Details

- Built with `@modelcontextprotocol/sdk`
- Uses async mock operations to simulate real-world delays
- Comprehensive error handling and validation
- Clear, structured responses with summaries
- Transaction IDs for successful transfers

This demo showcases how MCP can be used to create structured, tool-based interfaces for AI systems to interact with backend services safely and predictably.
