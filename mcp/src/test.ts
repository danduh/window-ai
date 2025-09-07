#!/usr/bin/env node

/**
 * Simple test script to verify the MCP server functionality
 * This is for development/testing purposes only
 */

import { PaymentService } from './services/paymentService.js';

async function runTests() {
  console.log('🧪 Testing Payment Service...\n');

  // Test 1: List all users
  console.log('📋 Test 1: List all users');
  const users = await PaymentService.getAllUsers();
  console.log(`Found ${users.length} users:`);
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.id}): $${user.balance.toFixed(2)}`);
  });
  console.log();

  // Test 2: Validate balance - sufficient funds
  console.log('✅ Test 2: Validate balance (sufficient funds)');
  const validation1 = await PaymentService.validateUserBalance('user_001', 100);
  console.log(`Result:`, validation1);
  console.log();

  // Test 3: Validate balance - insufficient funds
  console.log('❌ Test 3: Validate balance (insufficient funds)');
  const validation2 = await PaymentService.validateUserBalance('user_005', 100);
  console.log(`Result:`, validation2);
  console.log();

  // Test 4: Successful transfer
  console.log('💸 Test 4: Successful transfer');
  const transfer1 = await PaymentService.makeTransfer('user_001', 'bob@example.com', 100);
  console.log(`Result:`, transfer1);
  console.log();

  // Test 5: Failed transfer (insufficient funds)
  console.log('🚫 Test 5: Failed transfer (insufficient funds)');
  const transfer2 = await PaymentService.makeTransfer('user_005', 'alice@example.com', 100);
  console.log(`Result:`, transfer2);
  console.log();

  // Test 6: Get user info
  console.log('👤 Test 6: Get user info');
  const user = await PaymentService.getUserById('user_001');
  console.log(`User:`, user);
  console.log();

  console.log('✨ All tests completed!');
}

runTests().catch(console.error);
