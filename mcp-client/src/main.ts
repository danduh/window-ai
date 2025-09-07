import express from 'express';
import { PaymentMCPClient } from './services/paymentMCPClient.js';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
app.use(express.json());

// Initialize MCP client
const mcpClient = new PaymentMCPClient();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Payment MCP Client API',
    status: mcpClient.getConnectionStatus() ? 'connected' : 'disconnected',
    endpoints: [
      'GET /health - Health check',
      'GET /users - List all users',
      'GET /users/:userId - Get user info',
      'POST /validate-balance - Validate user balance',
      'POST /transfer - Make a transfer',
      'GET /demo - Run full demo'
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mcpConnected: mcpClient.getConnectionStatus(),
    timestamp: new Date().toISOString()
  });
});

// List all users
app.get('/users', async (req, res) => {
  try {
    const users = await mcpClient.listAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user info
app.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await mcpClient.getUserInfo(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: `User with ID ${userId} not found` 
      });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate balance
app.post('/validate-balance', async (req, res) => {
  try {
    const { userId, requiredAmount } = req.body;
    
    if (!userId || typeof requiredAmount !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'userId (string) and requiredAmount (number) are required'
      });
    }
    
    const validation = await mcpClient.validateBalance(userId, requiredAmount);
    res.json({ success: true, validation });
  } catch (error) {
    console.error('Error validating balance:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Make transfer
app.post('/transfer', async (req, res) => {
  try {
    const { fromUserId, toUserEmail, amount } = req.body;
    
    if (!fromUserId || !toUserEmail || typeof amount !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'fromUserId (string), toUserEmail (string), and amount (number) are required'
      });
    }
    
    const transfer = await mcpClient.makeTransfer(fromUserId, toUserEmail, amount);
    res.json({ success: true, transfer });
  } catch (error) {
    console.error('Error making transfer:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run demo
app.get('/demo', async (req, res) => {
  try {
    console.log('\n🎮 Running demo via API...');
    
    // Capture console output for the demo
    const originalLog = console.log;
    const logs: string[] = [];
    
    console.log = (...args) => {
      const message = args.join(' ');
      logs.push(message);
      originalLog(...args);
    };
    
    await mcpClient.runDemo();
    
    // Restore original console.log
    console.log = originalLog;
    
    res.json({ 
      success: true, 
      message: 'Demo completed successfully',
      logs 
    });
  } catch (error) {
    console.error('Error running demo:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mcpClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mcpClient.disconnect();
  process.exit(0);
});

// Start server and connect to MCP
async function startServer() {
  try {
    console.log('🚀 Starting Payment MCP Client API...');
    
    // Connect to MCP server
    await mcpClient.connect();
    
    // Start Express server
    app.listen(port, host, () => {
      console.log(`✅ API Server running at http://${host}:${port}`);
      console.log('🔌 Connected to MCP Payment Server');
      console.log('\n📖 Available endpoints:');
      console.log(`  GET  http://${host}:${port}/         - API info`);
      console.log(`  GET  http://${host}:${port}/health   - Health check`);
      console.log(`  GET  http://${host}:${port}/users    - List all users`);
      console.log(`  GET  http://${host}:${port}/users/:id - Get user info`);
      console.log(`  POST http://${host}:${port}/validate-balance - Validate balance`);
      console.log(`  POST http://${host}:${port}/transfer - Make transfer`);
      console.log(`  GET  http://${host}:${port}/demo     - Run demo`);
      console.log('\n🎮 Try: curl http://localhost:3001/demo');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
