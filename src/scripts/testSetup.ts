import dotenv from 'dotenv';
import { GolemDBService } from '../services/golemDbService';
import { BaseService } from '../services/baseService';

// Load environment variables
dotenv.config();

async function testSetup() {
  console.log('=== Testing Tarot Video Storefront Setup ===\n');

  try {
    // Test 1: GolemDB Connection
    console.log('🔍 Testing GolemDB connection...');
    const golemDB = new GolemDBService();
    await golemDB.initialize();
    console.log('✅ GolemDB connected successfully\n');

    // Test 2: Base Network Connection
    console.log('🔍 Testing Base network connection...');
    const baseService = new BaseService();
    const blockNumber = await baseService.getCurrentBlock();
    console.log(`✅ Base network connected (Current block: ${blockNumber})\n`);

    // Test 3: Create sample data
    console.log('🔍 Testing data creation...');

    // Create a sample tarot card
    const sampleCard = await golemDB.createTarotCard({
      name: "The Fool",
      number: 0,
      arcana: "Major",
      keywords: ["new beginnings", "innocence", "spontaneity"],
      uprightMeaning: "New journeys, fresh starts, innocence",
      reversedMeaning: "Recklessness, naivety, risk-taking",
      element: "Air",
      astrologicalSign: "Uranus",
      numerology: "0"
    });
    console.log(`✅ Created sample tarot card: ${sampleCard.name}\n`);

    // Create a sample subscription tier
    const sampleTier = await golemDB.createSubscriptionTier({
      name: "Basic Monthly",
      priceUsd: "9.99",
      durationDays: 30,
      benefits: ["Access to all videos", "Basic tarot readings"],
      isActive: true
    });
    console.log(`✅ Created sample subscription tier: ${sampleTier.name}\n`);

    // Test 4: Query sample data
    console.log('🔍 Testing data queries...');
    const cards = await golemDB.getAllTarotCards();
    console.log(`✅ Found ${cards.length} tarot cards\n`);

    const tiers = await golemDB.getActiveSubscriptionTiers();
    console.log(`✅ Found ${tiers.length} active subscription tiers\n`);

    console.log('🎉 All tests passed! Setup is working correctly.');
    console.log('\n🚀 You can now start the server with: bun run dev');

  } catch (error) {
    console.error('❌ Setup test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testSetup().catch(console.error);
}

export default testSetup;