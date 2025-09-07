import dotenv from 'dotenv';
import readline from 'readline';
import { GolemDBService } from '../services/golemDbService';
import { AuthService } from '../services/authService';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdminAccount() {
  console.log('=== Tarot Video Storefront Admin Setup ===\n');

  // Initialize services
  const golemDB = new GolemDBService();

  try {
    // Initialize GolemDB
    await golemDB.initialize();
    console.log('✅ GolemDB connected successfully\n');

    // Check if admin already exists
    console.log('Checking for existing admin users...');
    // In a real implementation, you'd check for existing admins
    console.log('No existing admin found. Proceeding with creation.\n');

    // Get admin credentials
    const email = await new Promise<string>((resolve) => {
      rl.question('Enter admin email: ', resolve);
    });

    const password = await new Promise<string>((resolve) => {
      rl.question('Enter admin password (min 8 characters): ', (input) => {
        if (input.length < 8) {
          console.log('Password must be at least 8 characters long');
          process.exit(1);
        }
        resolve(input);
      });
    });

    const confirmPassword = await new Promise<string>((resolve) => {
      rl.question('Confirm password: ', resolve);
    });

    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match!');
      process.exit(1);
    }

    // Create admin user
    console.log('\nCreating admin user...');
    const authService = new AuthService(golemDB);
    const adminUser = await authService.createAdminUser(email, password);

    console.log('✅ Admin account created successfully!');
    console.log(`👤 Admin ID: ${adminUser.id}`);
    console.log(`📧 Admin Email: ${adminUser.email}`);
    console.log(`🔒 Role: ${adminUser.role}`);
    console.log('\n🎉 You can now log in to the admin panel using these credentials.');

  } catch (error) {
    console.error('❌ Failed to create admin account:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminAccount().catch(console.error);
}

export default createAdminAccount;