// Simplified Payment MCP Client that demonstrates the concept
// Note: This version simulates MCP connection for demo purposes

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface PaymentUser {
  id: string;
  email: string;
  balance: number;
  name: string;
}

export interface BalanceValidationResult {
  isValid: boolean;
  currentBalance: number;
  requiredAmount: number;
  message: string;
}

export interface TransferResult {
  success: boolean;
  transactionId?: string;
  message: string;
  newBalance?: number;
}

// Mock data that matches the MCP server
const mockUsers: PaymentUser[] = [
  { id: "user_001", email: "alice@example.com", balance: 1500.50, name: "Alice Johnson" },
  { id: "user_002", email: "bob@example.com", balance: 750.25, name: "Bob Smith" },
  { id: "user_003", email: "charlie@example.com", balance: 2300.00, name: "Charlie Brown" },
  { id: "user_004", email: "diana@example.com", balance: 150.75, name: "Diana Prince" },
  { id: "user_005", email: "eve@example.com", balance: 0.00, name: "Eve Wilson" },
];

let transactionCounter = 1000;

export class PaymentMCPClient extends EventEmitter {
  private serverProcess: ChildProcess | null = null;
  private isConnected = false;
  private users: PaymentUser[] = [...mockUsers]; // Copy of mock data for simulation

  constructor() {
    super();
  }

  /**
   * Connect to the MCP payment server (simulated)
   */
  async connect(): Promise<void> {
    try {
      console.log('🔌 Starting MCP payment server connection...');
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, we'll simulate the connection
      // In a real implementation, this would use the MCP SDK
      this.isConnected = true;
      
      console.log('✅ Connected to MCP payment server (simulated)');
      this.emit('connected');

    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
        this.serverProcess = null;
      }

      this.isConnected = false;
      console.log('🔌 Disconnected from MCP server');
      this.emit('disconnected');
      
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }

  /**
   * Check if connected to the server
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    return ['validate_balance', 'make_transfer', 'get_user_info', 'list_all_users'];
  }

  /**
   * List all users in the payment system
   */
  async listAllUsers(): Promise<PaymentUser[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...this.users];
  }

  /**
   * Validate if a user has sufficient balance
   */
  async validateBalance(userId: string, requiredAmount: number): Promise<BalanceValidationResult> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const user = this.users.find(u => u.id === userId);
    
    if (!user) {
      return {
        isValid: false,
        currentBalance: 0,
        requiredAmount,
        message: `User with ID ${userId} not found`
      };
    }
    
    const isValid = user.balance >= requiredAmount;
    
    return {
      isValid,
      currentBalance: user.balance,
      requiredAmount,
      message: isValid 
        ? `User ${user.name} has sufficient balance` 
        : `Insufficient funds. Available: $${user.balance.toFixed(2)}, Required: $${requiredAmount.toFixed(2)}`
    };
  }

  /**
   * Make a transfer between users
   */
  async makeTransfer(fromUserId: string, toUserEmail: string, amount: number): Promise<TransferResult> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find sender
    const fromUser = this.users.find(u => u.id === fromUserId);
    if (!fromUser) {
      return {
        success: false,
        message: `Sender with ID ${fromUserId} not found`
      };
    }
    
    // Find recipient by email
    const toUser = this.users.find(u => u.email === toUserEmail);
    if (!toUser) {
      return {
        success: false,
        message: `Recipient with email ${toUserEmail} not found`
      };
    }
    
    // Check if sender has sufficient balance
    if (fromUser.balance < amount) {
      return {
        success: false,
        message: `Insufficient funds. Available: $${fromUser.balance.toFixed(2)}, Required: $${amount.toFixed(2)}`
      };
    }
    
    // Prevent self-transfer
    if (fromUser.id === toUser.id) {
      return {
        success: false,
        message: "Cannot transfer money to yourself"
      };
    }
    
    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        message: "Transfer amount must be greater than 0"
      };
    }
    
    // Process the transfer
    fromUser.balance -= amount;
    toUser.balance += amount;
    
    const transactionId = `TXN_${++transactionCounter}_${Date.now()}`;
    
    return {
      success: true,
      transactionId,
      newBalance: fromUser.balance,
      message: `Successfully transferred $${amount.toFixed(2)} from ${fromUser.name} to ${toUser.name}`
    };
  }

  /**
   * Get user information by ID
   */
  async getUserInfo(userId: string): Promise<PaymentUser | null> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    return this.users.find(u => u.id === userId) || null;
  }

  /**
   * Demo method that shows all capabilities
   */
  async runDemo(): Promise<void> {
    console.log('\n🎮 Running Payment MCP Client Demo...\n');

    try {
      // 1. List all tools
      console.log('📋 Available tools:');
      const tools = await this.listTools();
      tools.forEach(tool => console.log(`  - ${tool}`));
      console.log();

      // 2. List all users
      console.log('👥 All users in system:');
      const users = await this.listAllUsers();
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.id}): $${user.balance.toFixed(2)}`);
      });
      console.log();

      // 3. Validate balance
      console.log('💰 Checking Alice\'s balance for $200:');
      const validation = await this.validateBalance('user_001', 200);
      console.log(`  Result: ${validation.isValid ? '✅' : '❌'} ${validation.message}`);
      console.log();

      // 4. Make a successful transfer
      console.log('💸 Transferring $100 from Alice to Bob:');
      const transfer1 = await this.makeTransfer('user_001', 'bob@example.com', 100);
      console.log(`  Result: ${transfer1.success ? '✅' : '❌'} ${transfer1.message}`);
      if (transfer1.success) {
        console.log(`  Transaction ID: ${transfer1.transactionId}`);
        console.log(`  New balance: $${transfer1.newBalance?.toFixed(2)}`);
      }
      console.log();

      // 5. Try a failed transfer
      console.log('🚫 Trying to transfer $1000 from Eve (who has $0):');
      const transfer2 = await this.makeTransfer('user_005', 'alice@example.com', 1000);
      console.log(`  Result: ${transfer2.success ? '✅' : '❌'} ${transfer2.message}`);
      console.log();

      // 6. Check updated user info
      console.log('👤 Alice\'s updated info:');
      const aliceInfo = await this.getUserInfo('user_001');
      if (aliceInfo) {
        console.log(`  Name: ${aliceInfo.name}`);
        console.log(`  Email: ${aliceInfo.email}`);
        console.log(`  Balance: $${aliceInfo.balance.toFixed(2)}`);
      }
      console.log();

      console.log('✨ Demo completed successfully!');

    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }
}
