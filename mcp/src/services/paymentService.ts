// Mock payment service for demo purposes
export interface User {
  id: string;
  email: string;
  balance: number;
  name: string;
}

export interface TransferResult {
  success: boolean;
  transactionId?: string;
  message: string;
  newBalance?: number;
}

export interface BalanceValidationResult {
  isValid: boolean;
  currentBalance: number;
  requiredAmount: number;
  message: string;
}

// Mock user database
const mockUsers: User[] = [
  { id: "user_001", email: "alice@example.com", balance: 1500.50, name: "Alice Johnson" },
  { id: "user_002", email: "bob@example.com", balance: 750.25, name: "Bob Smith" },
  { id: "user_003", email: "charlie@example.com", balance: 2300.00, name: "Charlie Brown" },
  { id: "user_004", email: "diana@example.com", balance: 150.75, name: "Diana Prince" },
  { id: "user_005", email: "eve@example.com", balance: 0.00, name: "Eve Wilson" },
];

// Mock transaction history for generating transaction IDs
let transactionCounter = 1000;

export class PaymentService {
  
  /**
   * Validates if a user has sufficient balance for a transaction
   */
  static async validateUserBalance(userId: string, requiredAmount: number): Promise<BalanceValidationResult> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const user = mockUsers.find(u => u.id === userId);
    
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
   * Processes a money transfer between users
   */
  static async makeTransfer(fromUserId: string, toUserEmail: string, amount: number): Promise<TransferResult> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find sender
    const fromUser = mockUsers.find(u => u.id === fromUserId);
    if (!fromUser) {
      return {
        success: false,
        message: `Sender with ID ${fromUserId} not found`
      };
    }
    
    // Find recipient by email
    const toUser = mockUsers.find(u => u.email === toUserEmail);
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
   * Get user information by ID (helper method for demo)
   */
  static async getUserById(userId: string): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockUsers.find(u => u.id === userId) || null;
  }
  
  /**
   * Get all users (for demo purposes)
   */
  static async getAllUsers(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...mockUsers];
  }
}
