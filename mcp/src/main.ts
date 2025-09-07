import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { PaymentService } from './services/paymentService.js';

// Create MCP server for Payment Demo
const server = new Server(
  {
    name: 'payment-demo-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the tools for our payment system
const tools: Tool[] = [
  {
    name: 'validate_balance',
    description: 'Checks whether a user has sufficient account balance to complete a financial transaction. Returns balance validation status along with current balance information and detailed feedback.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The unique user identifier (UUID or string ID) of the account holder whose balance needs to be validated',
        },
        requiredAmount: {
          type: 'number',
          description: 'The monetary amount (in USD) required for the intended transaction. Must be a positive number or zero.',
          minimum: 0,
        },
      },
      required: ['userId', 'requiredAmount'],
    },
  },
  {
    name: 'make_transfer',
    description: 'Executes a secure money transfer between two users in the payment system. Automatically validates sender balance before processing and provides detailed transaction results including transaction ID for tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        fromUserId: {
          type: 'string',
          description: 'The unique identifier of the user initiating the transfer (sender). This user must have sufficient balance to cover the transfer amount.',
        },
        toUserEmail: {
          type: 'string',
          description: 'The email address of the recipient user. Must be a valid email format and correspond to an existing user in the system.',
          format: 'email',
        },
        amount: {
          type: 'number',
          description: 'The amount of money to transfer (in USD). Must be at least $0.01 and cannot exceed the sender\'s available balance.',
          minimum: 0.01,
        },
      },
      required: ['fromUserId', 'toUserEmail', 'amount'],
    },
  },
  {
    name: 'get_user_info',
    description: 'Retrieves comprehensive user account information including personal details and current balance. Useful for account lookups, balance inquiries, and user verification during payment operations.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The unique identifier of the user whose information should be retrieved. Returns null if no user exists with this ID.',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'list_all_users',
    description: 'Returns a complete list of all registered users in the payment system, including their basic information and current account balances. Primarily intended for demonstration and testing purposes.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'validate_balance': {
        const { userId, requiredAmount } = args as { userId: string; requiredAmount: number };
        const result = await PaymentService.validateUserBalance(userId, requiredAmount);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: 'validate_balance',
                result,
                summary: result.isValid 
                  ? `✅ Balance validation passed: $${result.currentBalance.toFixed(2)} available`
                  : `❌ Balance validation failed: ${result.message}`
              }, null, 2),
            },
          ],
        };
      }

      case 'make_transfer': {
        const { fromUserId, toUserEmail, amount } = args as { 
          fromUserId: string; 
          toUserEmail: string; 
          amount: number 
        };
        
        // First validate balance
        const balanceCheck = await PaymentService.validateUserBalance(fromUserId, amount);
        if (!balanceCheck.isValid) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  tool: 'make_transfer',
                  result: {
                    success: false,
                    message: `Transfer cancelled: ${balanceCheck.message}`
                  },
                  summary: `❌ Transfer failed: Insufficient balance`
                }, null, 2),
              },
            ],
          };
        }
        
        // Proceed with transfer
        const transferResult = await PaymentService.makeTransfer(fromUserId, toUserEmail, amount);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: 'make_transfer',
                result: transferResult,
                summary: transferResult.success 
                  ? `✅ Transfer completed: $${amount.toFixed(2)} sent successfully (Transaction: ${transferResult.transactionId})`
                  : `❌ Transfer failed: ${transferResult.message}`
              }, null, 2),
            },
          ],
        };
      }

      case 'get_user_info': {
        const { userId } = args as { userId: string };
        const user = await PaymentService.getUserById(userId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: 'get_user_info',
                result: user,
                summary: user 
                  ? `👤 User found: ${user.name} (${user.email}) - Balance: $${user.balance.toFixed(2)}`
                  : `❌ User not found with ID: ${userId}`
              }, null, 2),
            },
          ],
        };
      }

      case 'list_all_users': {
        const users = await PaymentService.getAllUsers();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: 'list_all_users',
                result: users,
                summary: `📋 Found ${users.length} users in the system`,
                userSummary: users.map(u => `${u.name} (${u.id}): $${u.balance.toFixed(2)}`).join('\n')
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            tool: name
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🏦 Payment Demo MCP Server is running...');
  console.error('Available tools: validate_balance, make_transfer, get_user_info, list_all_users');
}

main().catch((error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
