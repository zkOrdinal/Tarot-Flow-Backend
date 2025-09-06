// User Types
export interface User {
  id: string;
  walletAddress: string;
  email?: string; // Encrypted
  role: 'user' | 'admin';
  whitelistStatus: 'approved' | 'pending' | 'rejected';
  subscription?: {
    tierId?: string;
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
  };
  preferences?: {
    timezone?: string;
    language?: string;
  };
  gdprConsent?: {
    marketing: boolean;
    analytics: boolean;
    consentDate: Date;
  };
  createdAt: Date;
  lastLogin?: Date;
}

// Video Metadata Types
export interface VideoMetadata {
  key: string;
  value: string;
  type: 'string' | 'number' | 'date' | 'tag' | 'boolean';
}

// Video Types
export interface Video {
  id: string;
  title: string;
  description: string;
  type: 'exercise' | 'meditation' | 'tutorial';
  category?: string;
  pricing: {
    singlePriceUsd: string;
    isFreeWithSubscription: boolean;
  };
  metadata: VideoMetadata[];
  mediaUrls: {
    video: string;
    thumbnail?: string;
    preview?: string;
  };
  associatedCards: string[];
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tarot Card Types
export interface TarotCard {
  id: string;
  name: string;
  number?: number;
  arcana: 'Major' | 'Minor';
  suit?: 'Cups' | 'Wands' | 'Swords' | 'Pentacles';
  keywords: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  element?: string;
  astrologicalSign?: string;
  numerology?: string;
  createdAt: Date;
}

// Subscription Tier Types
export interface SubscriptionTier {
  id: string;
  name: string;
  priceUsd: string;
  durationDays: number;
  benefits: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Watch History Types
export interface WatchHistoryItem {
  watchedAt: Date;
  progressSeconds: number;
  completed: boolean;
}

// User Video Access Types
export interface UserVideoAccess {
  id: string;
  userId: string;
  videoId: string;
  accessType: 'purchase' | 'subscription' | 'free';
  transactionHash?: string;
  purchaseDate?: Date;
  expiryDate?: Date;
  paymentToken?: 'USDC' | 'ETH';
  amountPaid?: string;
  watchHistory: WatchHistoryItem[];
  isFavorite: boolean;
}

// User Reading Types
export interface UserReading {
  id: string;
  userId: string;
  cardDrawn: string;
  readingType: 'daily' | 'weekly' | 'custom';
  orientation: 'upright' | 'reversed';
  drawnAt: Date;
  journalEntry?: string; // Encrypted
  mood?: string;
  intention?: string;
}

// Card-Video Relationship Types
export interface CardVideoRelationship {
  id: string;
  cardId: string;
  videoId: string;
  relationshipType: 'recommended' | 'essential' | 'complementary';
  strength: 'primary' | 'secondary';
  curatorNotes?: string;
}