import { Request, Response } from 'express';
import { GolemDBService } from '../services/golemDbService';
import { TarotCard, UserReading } from '../types';
import { generateId } from '../utils/helpers';

/**
 * Tarot Controller for handling tarot card drawing and readings
 */
export class TarotController {
  constructor(
    private golemDB: GolemDBService
  ) {}

  /**
   * Draw a random tarot card
   */
  drawCard = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // Check if user is whitelisted
      const user = await this.golemDB.findUserByWallet(req.user?.walletAddress || '');
      if (!user || user.whitelistStatus !== 'approved') {
        return res.status(403).json({ 
          error: 'User not whitelisted for tarot readings' 
        });
      }

      // Get all tarot cards
      const cards = await this.golemDB.getAllTarotCards();

      if (cards.length === 0) {
        return res.status(500).json({ 
          error: 'No tarot cards available' 
        });
      }

      // Randomly select a card
      const randomIndex = Math.floor(Math.random() * cards.length);
      const selectedCard = cards[randomIndex];

      // Randomly determine orientation (upright or reversed)
      const isUpright = Math.random() > 0.5;
      const orientation = isUpright ? 'upright' : 'reversed';

      // Get meaning based on orientation
      const meaning = isUpright ? selectedCard.uprightMeaning : selectedCard.reversedMeaning;

      // Get associated videos
      const associatedVideos = await this.getAssociatedVideos(selectedCard.id);

      res.json({
        success: true,
        card: {
          id: selectedCard.id,
          name: selectedCard.name,
          number: selectedCard.number,
          arcana: selectedCard.arcana,
          suit: selectedCard.suit,
          keywords: selectedCard.keywords,
          meaning: meaning,
          orientation: orientation,
          element: selectedCard.element,
          astrologicalSign: selectedCard.astrologicalSign,
          numerology: selectedCard.numerology
        },
        associatedVideos: associatedVideos,
        canJournal: true // Whitelisted users can journal
      });
    } catch (error) {
      console.error('Error drawing tarot card:', error);
      res.status(500).json({ 
        error: 'Failed to draw tarot card' 
      });
    }
  };

  /**
   * Save tarot reading with journal entry
   */
  saveReading = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { cardId, orientation, journalEntry, mood, intention } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // Validate input
      if (!cardId || !orientation) {
        return res.status(400).json({ 
          error: 'cardId and orientation are required' 
        });
      }

      if (orientation !== 'upright' && orientation !== 'reversed') {
        return res.status(400).json({ 
          error: 'orientation must be either upright or reversed' 
        });
      }

      // Check if user is whitelisted
      const user = await this.golemDB.findUserByWallet(req.user?.walletAddress || '');
      if (!user || user.whitelistStatus !== 'approved') {
        return res.status(403).json({ 
          error: 'User not whitelisted for tarot readings' 
        });
      }

      // Verify card exists
      const card = await this.golemDB.getTarotCardById(cardId);
      if (!card) {
        return res.status(404).json({ 
          error: 'Tarot card not found' 
        });
      }

      // Create reading record
      const reading: Omit<UserReading, 'id'> = {
        userId: userId,
        cardDrawn: cardId,
        readingType: 'custom', // Could be 'daily', 'weekly', etc.
        orientation: orientation,
        drawnAt: new Date(),
        journalEntry: journalEntry, // In production, this should be encrypted
        mood: mood,
        intention: intention
      };

      const savedReading = await this.golemDB.recordTarotReading(reading);

      res.json({
        success: true,
        message: 'Tarot reading saved successfully',
        readingId: savedReading.id,
        drawnAt: savedReading.drawnAt
      });
    } catch (error) {
      console.error('Error saving tarot reading:', error);
      res.status(500).json({ 
        error: 'Failed to save tarot reading' 
      });
    }
  };

  /**
   * Get user's reading history
   */
  getReadingHistory = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // Check if user is whitelisted
      const user = await this.golemDB.findUserByWallet(req.user?.walletAddress || '');
      if (!user || user.whitelistStatus !== 'approved') {
        return res.status(403).json({ 
          error: 'User not whitelisted for tarot readings' 
        });
      }

      // Get user's readings
      const allReadings = await this.golemDB.getUserReadings(userId, limit + offset);
      const paginatedReadings = allReadings.slice(offset, offset + limit);

      // Enrich readings with card information
      var enrichedReadings: any = []; //FIXME any
      for (const reading of paginatedReadings) {
        const card = await this.golemDB.getTarotCardById(reading.cardDrawn);
        if (card) {
          enrichedReadings.push({
            id: reading.id,
            card: {
              id: card.id,
              name: card.name,
              number: card.number,
              arcana: card.arcana
            },
            readingType: reading.readingType,
            orientation: reading.orientation,
            drawnAt: reading.drawnAt,
            mood: reading.mood,
            intention: reading.intention,
            hasJournal: !!reading.journalEntry
          });
        }
      }

      res.json({
        success: true,
        count: enrichedReadings.length,
        total: allReadings.length,
        readings: enrichedReadings
      });
    } catch (error) {
      console.error('Error fetching reading history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch reading history' 
      });
    }
  };

  /**
   * Get specific reading by ID
   */
  getReadingById = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      if (!id) {
        return res.status(400).json({ 
          error: 'Reading ID is required' 
        });
      }

      // Check if user is whitelisted
      const user = await this.golemDB.findUserByWallet(req.user?.walletAddress || '');
      if (!user || user.whitelistStatus !== 'approved') {
        return res.status(403).json({ 
          error: 'User not whitelisted for tarot readings' 
        });
      }

      // In a real implementation, you'd query for the specific reading
      // For now, we'll simulate by getting recent readings and finding the one
      const readings = await this.golemDB.getUserReadings(userId, 100);
      const reading = readings.find(r => r.id === id);

      if (!reading) {
        return res.status(404).json({ 
          error: 'Reading not found' 
        });
      }

      // Verify ownership
      if (reading.userId !== userId) {
        return res.status(403).json({ 
          error: 'Access denied to this reading' 
        });
      }

      // Get card details
      const card = await this.golemDB.getTarotCardById(reading.cardDrawn);

      res.json({
        success: true,
        reading: {
          id: reading.id,
          card: card ? {
            id: card.id,
            name: card.name,
            number: card.number,
            arcana: card.arcana,
            suit: card.suit,
            keywords: card.keywords,
            uprightMeaning: card.uprightMeaning,
            reversedMeaning: card.reversedMeaning,
            element: card.element,
            astrologicalSign: card.astrologicalSign,
            numerology: card.numerology
          } : null,
          readingType: reading.readingType,
          orientation: reading.orientation,
          drawnAt: reading.drawnAt,
          journalEntry: reading.journalEntry, // In production, decrypt this
          mood: reading.mood,
          intention: reading.intention
        }
      });
    } catch (error) {
      console.error('Error fetching reading:', error);
      res.status(500).json({ 
        error: 'Failed to fetch reading' 
      });
    }
  };

  /**
   * Get all tarot cards
   */
  getAllCards = async (req: Request, res: Response) => {
    try {
      const cards = await this.golemDB.getAllTarotCards();

      // Format response
      const formattedCards = cards.map(card => ({
        id: card.id,
        name: card.name,
        number: card.number,
        arcana: card.arcana,
        suit: card.suit,
        keywords: card.keywords,
        element: card.element,
        astrologicalSign: card.astrologicalSign,
        numerology: card.numerology
      }));

      res.json({
        success: true,
        count: formattedCards.length,
        cards: formattedCards
      });
    } catch (error) {
      console.error('Error fetching tarot cards:', error);
      res.status(500).json({ 
        error: 'Failed to fetch tarot cards' 
      });
    }
  };

  /**
   * Get specific tarot card by ID
   */
  getCardById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ 
          error: 'Card ID is required' 
        });
      }

      const card = await this.golemDB.getTarotCardById(id);

      if (!card) {
        return res.status(404).json({ 
          error: 'Tarot card not found' 
        });
      }

      res.json({
        success: true,
        card: {
          id: card.id,
          name: card.name,
          number: card.number,
          arcana: card.arcana,
          suit: card.suit,
          keywords: card.keywords,
          uprightMeaning: card.uprightMeaning,
          reversedMeaning: card.reversedMeaning,
          element: card.element,
          astrologicalSign: card.astrologicalSign,
          numerology: card.numerology,
          createdAt: card.createdAt
        }
      });
    } catch (error) {
      console.error('Error fetching tarot card:', error);
      res.status(500).json({ 
        error: 'Failed to fetch tarot card' 
      });
    }
  };

  /**
   * Get videos associated with a tarot card
   */
  private async getAssociatedVideos(cardId: string) {
    try {
      // In a real implementation, you'd query card-video relationships
      // For now, we'll get all videos and filter by associatedCards
      const allVideos = await this.golemDB.getActiveVideos();
      const cardVideos = allVideos.filter(video => 
        video.associatedCards.includes(cardId)
      );

      // Format videos for response
      return cardVideos.map(video => ({
        id: video.id,
        title: video.title,
        type: video.type,
        category: video.category,
        pricing: video.pricing,
        thumbnail: video.mediaUrls.thumbnail,
        duration: video.metadata.find(m => m.key === 'duration')?.value
      }));
    } catch (error) {
      console.error('Error fetching associated videos:', error);
      return [];
    }
  }
}