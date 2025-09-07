#!/usr/bin/env node

// Simple CLI client for the Payment MCP Server
import { PaymentMCPClient } from './services/paymentMCPClient.js';
import readline from 'readline';

class PaymentCLI {
  private mcpClient: PaymentMCPClient;
  private rl: readline.Interface;

  constructor() {
    this.mcpClient = new PaymentMCPClient();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🏦 Payment MCP CLI Client');
    console.log('========================\n');

    try {
      console.log('🔌 Connecting to MCP server...');
      await this.mcpClient.connect();
      console.log('✅ Connected successfully!\n');

      await this.showMenu();
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      process.exit(1);
    }
  }

  async showMenu() {
    console.log('\n📋 Available commands:');
    console.log('1. List all users');
    console.log('2. Get user info');
    console.log('3. Validate balance');
    console.log('4. Make transfer');
    console.log('5. Run full demo');
    console.log('6. Exit');
    console.log();

    this.rl.question('Choose an option (1-6): ', async (choice) => {
      await this.handleChoice(choice.trim());
    });
  }

  async handleChoice(choice: string) {
    try {
      switch (choice) {
        case '1':
          await this.listUsers();
          break;
        case '2':
          await this.getUserInfo();
          break;
        case '3':
          await this.validateBalance();
          break;
        case '4':
          await this.makeTransfer();
          break;
        case '5':
          await this.runDemo();
          break;
        case '6':
          await this.exit();
          return;
        default:
          console.log('❌ Invalid choice. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }

    await this.showMenu();
  }

  async listUsers() {
    console.log('\n👥 Listing all users...');
    const users = await this.mcpClient.listAllUsers();
    
    console.log('\nUsers in the system:');
    users.forEach(user => {
      console.log(`  • ${user.name} (${user.id})`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Balance: $${user.balance.toFixed(2)}`);
      console.log();
    });
  }

  async getUserInfo() {
    const userId = await this.question('Enter user ID: ');
    
    console.log(`\n👤 Getting info for user: ${userId}`);
    const user = await this.mcpClient.getUserInfo(userId);
    
    if (user) {
      console.log(`\nUser Information:`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Balance: $${user.balance.toFixed(2)}`);
    } else {
      console.log(`❌ User with ID '${userId}' not found`);
    }
  }

  async validateBalance() {
    const userId = await this.question('Enter user ID: ');
    const amountStr = await this.question('Enter required amount: $');
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) {
      console.log('❌ Invalid amount entered');
      return;
    }

    console.log(`\n💰 Validating balance for user ${userId}...`);
    const validation = await this.mcpClient.validateBalance(userId, amount);
    
    console.log(`\nValidation Result:`);
    console.log(`  ${validation.isValid ? '✅' : '❌'} ${validation.message}`);
    console.log(`  Current Balance: $${validation.currentBalance.toFixed(2)}`);
    console.log(`  Required Amount: $${validation.requiredAmount.toFixed(2)}`);
  }

  async makeTransfer() {
    const fromUserId = await this.question('Enter sender user ID: ');
    const toUserEmail = await this.question('Enter recipient email: ');
    const amountStr = await this.question('Enter transfer amount: $');
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) {
      console.log('❌ Invalid amount entered');
      return;
    }

    console.log(`\n💸 Processing transfer...`);
    const transfer = await this.mcpClient.makeTransfer(fromUserId, toUserEmail, amount);
    
    console.log(`\nTransfer Result:`);
    console.log(`  ${transfer.success ? '✅' : '❌'} ${transfer.message}`);
    
    if (transfer.success) {
      console.log(`  Transaction ID: ${transfer.transactionId}`);
      console.log(`  New Sender Balance: $${transfer.newBalance?.toFixed(2)}`);
    }
  }

  async runDemo() {
    console.log('\n🎮 Running full demo...');
    await this.mcpClient.runDemo();
  }

  async exit() {
    console.log('\n👋 Disconnecting from MCP server...');
    await this.mcpClient.disconnect();
    console.log('✅ Goodbye!');
    this.rl.close();
    process.exit(0);
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Start the CLI if this file is run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('cli.js');
if (isMainModule) {
  const cli = new PaymentCLI();
  cli.start().catch(console.error);
}
