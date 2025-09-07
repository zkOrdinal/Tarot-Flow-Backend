import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import services
import { GolemDBService } from './services/golemDbService';
import { BaseService } from './services/baseService';
import { AuthMiddleware } from './middleware/authMiddleware';

// Import controllers
import { VideoController } from './controllers/videoController';
import { PurchaseController } from './controllers/purchaseController';
import { TarotController } from './controllers/tarotController';
import { AdminController } from './controllers/adminController';

// Import configs
import { PORT } from './config/networks';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const golemDB = new GolemDBService();
const baseService = new BaseService();
const authMiddleware = new AuthMiddleware(golemDB);

// Initialize controllers
const videoController = new VideoController(golemDB, authMiddleware);
const purchaseController = new PurchaseController(golemDB, baseService);
const tarotController = new TarotController(golemDB);
const adminController = new AdminController(golemDB);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'tarot-video-storefront'
  });
});

// Public routes
app.get('/api/videos', videoController.getVideos);
app.get('/api/videos/:id', videoController.getVideoById);
app.get('/api/videos/search', videoController.searchVideos);
app.get('/api/videos/card/:cardId', videoController.getVideosByCard);
app.get('/api/tarot/cards', tarotController.getAllCards);
app.get('/api/tarot/cards/:id', tarotController.getCardById);
app.get('/api/subscriptions/tiers', purchaseController.getSubscriptionTiers);

// Authentication routes
app.post('/api/auth/wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ 
        error: 'walletAddress is required' 
      });
    }

    const authService = new (await import('./services/authService')).AuthService(golemDB);
    const authResult = await authService.authenticateUser(walletAddress);

    if (!authResult) {
      return res.status(401).json({ 
        error: 'Authentication failed' 
      });
    }

    res.json({
      success: true,
      user: {
        id: authResult.user.id,
        walletAddress: authResult.user.walletAddress,
        role: authResult.user.role,
        whitelistStatus: authResult.user.whitelistStatus
      },
      token: authResult.token
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed' 
    });
  }
});

// Protected routes - require authentication
app.get('/api/videos/:id/content', 
  authMiddleware.requireAuth, 
  videoController.getVideoContent
);

app.get('/api/user/videos', 
  authMiddleware.requireAuth, 
  videoController.getUserPurchasedVideos
);

// Protected routes - require whitelist
app.post('/api/tarot/draw', 
  authMiddleware.requireWhitelist, 
  tarotController.drawCard
);

app.post('/api/readings', 
  authMiddleware.requireWhitelist, 
  tarotController.saveReading
);

app.get('/api/readings', 
  authMiddleware.requireWhitelist, 
  tarotController.getReadingHistory
);

app.get('/api/readings/:id', 
  authMiddleware.requireWhitelist, 
  tarotController.getReadingById
);

// Purchase routes - require whitelist
app.post('/api/purchases/video', 
  authMiddleware.requireWhitelist, 
  purchaseController.verifyVideoPurchase
);

app.post('/api/purchases/subscription', 
  authMiddleware.requireWhitelist, 
  purchaseController.verifySubscriptionPurchase
);

app.get('/api/subscriptions/status', 
  authMiddleware.requireAuth, 
  purchaseController.getSubscriptionStatus
);

app.post('/api/subscriptions/cancel', 
  authMiddleware.requireAuth, 
  purchaseController.cancelSubscription
);

// Admin routes - require admin role
app.post('/api/admin/videos', 
  authMiddleware.requireAdmin, 
  adminController.createVideo
);

app.put('/api/admin/videos/:id', 
  authMiddleware.requireAdmin, 
  adminController.updateVideo
);

app.post('/api/admin/videos/bulk-price-update', 
  authMiddleware.requireAdmin, 
  adminController.bulkUpdatePrices
);

app.post('/api/admin/cards', 
  authMiddleware.requireAdmin, 
  adminController.createTarotCard
);

app.post('/api/admin/subscription-tiers', 
  authMiddleware.requireAdmin, 
  adminController.createSubscriptionTier
);

app.put('/api/admin/subscription-tiers/:id', 
  authMiddleware.requireAdmin, 
  adminController.updateSubscriptionTier
);

app.post('/api/admin/users/whitelist', 
  authMiddleware.requireAdmin, 
  adminController.addUserToWhitelist
);

app.delete('/api/admin/users/whitelist', 
  authMiddleware.requireAdmin, 
  adminController.removeUserFromWhitelist
);

app.get('/api/admin/users/whitelist/stats', 
  authMiddleware.requireAdmin, 
  adminController.getWhitelistStats
);

app.post('/api/admin/videos/bulk-import', 
  authMiddleware.requireAdmin, 
  adminController.bulkImportVideos
);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found' 
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error' 
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Create GolemDB service instance
    const golemDB = new GolemDBService();
    console.log('✅ GolemDB service initialized');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer().catch(console.error);

export default app;