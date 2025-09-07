import { 
  createClient, 
  Tagged, 
  AccountData,
  Annotation,
  GolemBaseCreate
} from 'golem-base-sdk';
import type {
  GolemBaseClient
} from 'golem-base-sdk';
import { 
  User, 
  Video, 
  TarotCard, 
  SubscriptionTier, 
  UserReading, 
  UserVideoAccess, 
  CardVideoRelationship 
} from '../types';
import { NETWORK_CONFIG } from '../config/networks';
import { generateId } from '../utils/helpers';
import { randomUUID } from 'crypto';

/**
 * GolemDB Service for managing all database operations
 */
export class GolemDBService {

  private client: GolemBaseClient;
  private encoder: TextEncoder;
  private decoder: TextDecoder;

  constructor() {
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();

    // Initialize GolemDB connection
    this.initializeClient();
  }

  /**
   * Initialize GolemDB client connection
   */
  private async initializeClient(): Promise<void> {
    try {
      // For demo purposes, we'll use a mock private key
      // In production, you should use a proper private key from environment
      const mockPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil default private key
      const hexKey = mockPrivateKey.startsWith('0x') ? mockPrivateKey.slice(2) : mockPrivateKey;
      const key: AccountData = new Tagged("privatekey", Buffer.from(hexKey, 'hex'));

      this.client = await createClient(
        17000, // Holesky chain ID
        key,
        NETWORK_CONFIG.GOLEMDB.rpcUrl,
        NETWORK_CONFIG.GOLEMDB.rpcUrl.replace('rpc', 'rpc/ws')
      );

      console.log("✅ Connected to GolemDB on Holesky testnet!");

      // Get owner address
      const ownerAddress = await this.client.getOwnerAddress();
      console.log(`🔗 Connected with address: ${ownerAddress}`);
    } catch (error) {
      console.error("❌ Failed to connect to GolemDB:", error);
      throw error;
    }
  }

  /**
   * Encode data for storage
   */
  private encodeData(data: any): Uint8Array {
    return this.encoder.encode(JSON.stringify(data));
  }

  /**
   * Decode data from storage
   */
  private decodeData(data: Uint8Array): any {
    return JSON.parse(this.decoder.decode(data));
  }

  /**
   * Create a new user
   */
  async createUser(userData: Partial<User>): Promise<User> {
    const newUser: User = {
      id: generateId(),
      walletAddress: userData.walletAddress!,
      role: userData.role || 'user',
      whitelistStatus: userData.whitelistStatus || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...userData
    };

    const id = randomUUID();
    const creates: GolemBaseCreate[] = [
      {
        data: this.encodeData(newUser),
        btl: 1000000, // Long-lived entity
        stringAnnotations: [
          new Annotation("type", "user"),
          new Annotation("id", newUser.id),
          new Annotation("walletAddress", newUser.walletAddress)
        ],
        numericAnnotations: [
          new Annotation("createdAt", newUser.createdAt.getTime())
        ]
      }
    ];

    const createReceipt = await this.client.createEntities(creates);
    console.log('User created with receipt:', createReceipt);
    return newUser;
  }

  /**
   * Find user by wallet address
   */
  async findUserByWallet(walletAddress: string): Promise<User | null> {
    try {
      const entities = await this.client.queryEntities(`type = "user" && walletAddress = "${walletAddress}"`);

      if (entities.length > 0) {
        const data = this.decodeData(entities[0].storageValue);
        return data;
      }

      return null;
    } catch (error) {
      console.error("Error finding user by wallet:", error);
      return null;
    }
  }

  /**
   * Update user
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    // In GolemDB, updates typically involve creating a new version
    // For simplicity, we'll treat this as a replacement
    const existingUser = await this.getUserById(id);
    if (!existingUser) return null;

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      updatedAt: new Date()
    };

    // Create updated entity
    const creates: GolemBaseCreate[] = [
      {
        data: this.encodeData(updatedUser),
        btl: 1000000, // Long-lived entity
        stringAnnotations: [
          new Annotation("type", "user"),
          new Annotation("id", updatedUser.id),
          new Annotation("walletAddress", updatedUser.walletAddress)
        ],
        numericAnnotations: [
          new Annotation("createdAt", updatedUser.createdAt.getTime()),
          new Annotation("updatedAt", updatedUser.updatedAt?.getTime() || Date.now())
        ]
      }
    ];

    await this.client.createEntities(creates);
    return updatedUser;
  }

  /**
   * Get user by ID
   */
  private async getUserById(id: string): Promise<User | null> {
    try {
      const entities = await this.client.queryEntities(`type = "user" && id = "${id}"`);

      if (entities.length > 0) {
        const data = this.decodeData(entities[0].storageValue);
        return data;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all active subscription tiers
   */
  async getActiveSubscriptionTiers(): Promise<SubscriptionTier[]> {
    try {
      const entities = await this.client.queryEntities('type = "subscription_tier" && isActive = "true"');

      return entities.map(entity => {
        const data = this.decodeData(entity.storageValue);
        return data;
      });
    } catch (error) {
      console.error("Error fetching subscription tiers:", error);
      return [];
    }
  }

  /**
   * Get subscription tier by ID
   */
  async getSubscriptionTierById(id: string): Promise<SubscriptionTier | null> {
    try {
      const entities = await this.client.queryEntities(`type = "subscription_tier" && id = "${id}"`);

      if (entities.length > 0) {
        const data = this.decodeData(entities[0].storageValue);
        return data;
      }

      return null;
    } catch (error) {
      console.error("Error fetching subscription tier:", error);
      return null;
    }
  }

  /**
   * Create subscription tier
   */
  async createSubscriptionTier(tierData: Omit<SubscriptionTier, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionTier> {
    const newTier: SubscriptionTier = {
      id: generateId(),
      ...tierData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const creates: GolemBaseCreate[] = [
      {
        data: this.encodeData(newTier),
        btl: 1000000, // Long-lived entity
        stringAnnotations: [
          new Annotation("type", "subscription_tier"),
          new Annotation("id", newTier.id),
          new Annotation("isActive", newTier.isActive.toString())
        ],
        numericAnnotations: [
          new Annotation("createdAt", newTier.createdAt.getTime()),
          new Annotation("priceUsd", parseFloat(newTier.priceUsd) * 100), // Store as cents
          new Annotation("durationDays", newTier.durationDays)
        ]
      }
    ];

    await this.client.createEntities(creates);
    return newTier;
  }

  /**
   * Get all active videos
   */
  async getActiveVideos(): Promise<Video[]> {
    try {
      const entities = await this.client.queryEntities('type = "video" && isActive = "true"');

      return entities.map(entity => {
        const data = this.decodeData(entity.storageValue);
        return data;
      });
    } catch (error) {
      console.error("Error fetching videos:", error);
      return [];
    }
  }

  /**
   * Get video by ID
   */
  async getVideoById(id: string): Promise<Video | null> {
    try {
      const entities = await this.client.queryEntities(`type = "video" && id = "${id}"`);

      if (entities.length > 0) {
        const data = this.decodeData(entities[0].storageValue);
        return data;
      }

      return null;
    } catch (error) {
      console.error("Error fetching video:", error);
      return null;
    }
  }

  /**
   * Create video
   */
  async createVideo(videoData: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>): Promise<Video> {
    const newVideo: Video = {
      id: generateId(),
      ...videoData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const creates: GolemBaseCreate[] = [
      {
        data: this.encodeData(newVideo),
        btl: 1000000, // Long-lived entity
        stringAnnotations: [
          new Annotation("type", "video"),
          new Annotation("id", newVideo.id),
          new Annotation("isActive", newVideo.isActive.toString()),
          new Annotation("title", newVideo.title),
          new Annotation("typeCategory", newVideo.type)
        ],
        numericAnnotations: [
          new Annotation("createdAt", newVideo.createdAt.getTime()),
          new Annotation("priceUsd", parseFloat(newVideo.pricing.singlePriceUsd) * 100) // Store as cents
        ]
      }
    ];

    await this.client.createEntities(creates);
    return newVideo;
  }

  /**
   * Get all tarot cards
   */
  async getAllTarotCards(): Promise<TarotCard[]> {
    try {
      const entities = await this.client.queryEntities('type = "tarot_card"');

      return entities.map(entity => {
        const data = this.decodeData(entity.storageValue);
        return data;
      });
    } catch (error) {
      console.error("Error fetching tarot cards:", error);
      return [];
    }
  }

  /**
   * Initialize the GolemDB service
   */
  public async initialize(): Promise<void> {
    try {
      await this.initializeClient();
      console.log("✅ Connected to GolemDB on Holesky testnet!");
    } catch (error) {
      console.error("❌ Failed to initialize GolemDB:", error);
      throw error;
    }
  }

  /**
   * Get tarot card by ID
   */
  async getTarotCardById(id: string): Promise<TarotCard | null> {
    try {
      const entities = await this.client.queryEntities(`type = "tarot_card" && id = "${id}"`);

      if (entities.length > 0) {
        const data = this.decodeData(entities[0].storageValue);
        return data;
      }

      return null;
    } catch (error) {
      console.error("Error fetching tarot card:", error);
      return null;
    }
  }

  /**
   * Create tarot card
   */
  async createTarotCard(cardData: Omit<TarotCard, 'id' | 'createdAt'>): Promise<TarotCard> {
    const newCard: TarotCard = {
      id: generateId(),
      ...cardData,
      createdAt: new Date()
    };

    const creates: GolemBaseCreate[] = [
      {
        data: this.encodeData(newCard),
        btl: 1000000, // Long-lived entity
        stringAnnotations: [
          new Annotation("type", "tarot_card"),
          new Annotation("id", newCard.id),
          new Annotation("name", newCard.name),
          new Annotation("arcana", newCard.arcana)
        ],
        numericAnnotations: [
          new Annotation("createdAt", newCard.createdAt.getTime()),
          new Annotation("number", newCard.number || 0)
        ]
      }
    ];

    await this.client.createEntities(creates);
    return newCard;
  }

  /**
   * Record user video access (purchase/subscription)
   */
  async recordUserVideoAccess(accessData: Omit<UserVideoAccess, 'id'>): Promise<UserVideoAccess> {
    const newAccess: UserVideoAccess = {
      id: generateId(),
      ...accessData,
      watchHistory: accessData.watchHistory || []
    };

    const creates: GolemBaseCreate[] = [
      {
        data: this.encodeData(newAccess),
        btl: 1000000, // Long-lived entity
        stringAnnotations: [
          new Annotation("type", "user_video_access"),
          new Annotation("id", newAccess.id),
          new Annotation("userId", newAccess.userId),
          new Annotation("videoId", newAccess.videoId),
          new Annotation("accessType", newAccess.accessType)
        ],
        numericAnnotations: [
          new Annotation("createdAt", newAccess.purchaseDate?.getTime() || Date.now())
        ]
      }
    ];

    await this.client.createEntities(creates);
    return newAccess;
  }

  /**
   * Check if user has access to video
   */
  async checkUserVideoAccess(userId: string, videoId: string): Promise<boolean> {
    try {
      const entities = await this.client.queryEntities(
        `type = "user_video_access" && userId = "${userId}" && videoId = "${videoId}"`
      );

      if (entities.length > 0) {
        return true;
      }

      // Check if user has active subscription
      const user = await this.findUserByWallet(""); // We'd need wallet address here
      if (user?.subscription?.isActive && user.subscription.endDate && user.subscription.endDate > new Date()) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking video access:", error);
      return false;
    }
  }

  /**
   * Record tarot reading
   */
  async recordTarotReading(readingData: Omit<UserReading, 'id'>): Promise<UserReading> {
    const newReading: UserReading = {
      id: generateId(),
      ...readingData
    };

    const creates: GolemBaseCreate[] = [
      {
        data: this.encodeData(newReading),
        btl: 1000000, // Long-lived entity
        stringAnnotations: [
          new Annotation("type", "user_reading"),
          new Annotation("id", newReading.id),
          new Annotation("userId", newReading.userId),
          new Annotation("cardDrawn", newReading.cardDrawn),
          new Annotation("readingType", newReading.readingType)
        ],
        numericAnnotations: [
          new Annotation("drawnAt", newReading.drawnAt.getTime())
        ]
      }
    ];

    await this.client.createEntities(creates);
    return newReading;
  }

  /**
   * Get user's recent readings
   */
  async getUserReadings(userId: string, limit: number = 10): Promise<UserReading[]> {
    try {
      const entities = await this.client.queryEntities(
        `type = "user_reading" && userId = "${userId}"`
      );

      return entities
        .map(entity => {
          const data = this.decodeData(entity.storageValue);
          return data;
        })
        .sort((a, b) => b.drawnAt.getTime() - a.drawnAt.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error("Error fetching user readings:", error);
      return [];
    }
  }

  /**
   * Whitelist a user
   */
  async whitelistUser(userId: string): Promise<User | null> {
    return await this.updateUser(userId, { 
      whitelistStatus: 'approved',
      updatedAt: new Date()
    });
  }
}