# Tarot Video Storefront Backend

A Web3 video storefront built on Base network with GolemDB database, featuring tarot card drawing, yoga/meditation videos, and hybrid payment system.

Made during [ETHWarsaw Hackathon](https://www.ethwarsaw.dev/hackathon).

## 🚀 Features

- **Web3 Integration**: Base network payments with USDC/ETH support
- **Tarot System**: Card drawing with journaling for whitelisted users
- **Video Content**: Yoga and meditation videos with flexible metadata
- **Hybrid Payments**: Single purchases or subscription-based access
- **User Whitelisting**: Controlled access to premium features
- **Admin Panel**: Content management and user administration
- **GDPR Compliant**: Secure handling of personal data

## 🏗️ Tech Stack

- **Backend**: TypeScript with Bun runtime
- **Database**: GolemDB on Holesky testnet
- **Blockchain**: Base Sepolia testnet for payments
- **Authentication**: JWT with wallet-based login
- **Payments**: USDC and ETH via Base Minikit

## 📁 Project Structure

```
src/
├── controllers/ # API route handlers
├── services/ # Business logic and external services
├── middleware/ # Authentication and request handling
├── types/ # TypeScript interfaces and types
├── config/ # Configuration files
├── utils/ # Helper functions
└── server.ts # Main application entry point

scripts/
├── createAdmin.ts # Admin user bootstrap
└── testSetup.ts # Setup verification
```

## 🛠️ Setup Instructions

### Prerequisites

1. **Bun Runtime**: Install from [bun.sh](https://bun.sh)
2. **GolemDB Wallet**: Set up using golembase-demo-cli
3. **Environment Variables**: Copy `.env.example` to `.env` and configure

### Installation
```bash
Clone the repository

git clone 
cd tarot-video-storefront

Install dependencies

bun install

Copy and configure environment variables

cp .env.example .env

Edit .env with your configuration
```
### Environment Variables
```env
Network Configuration

BASE_RPC_URL=https://sepolia.base.org
GOLEM_RPC_URL=https://ethwarsaw.holesky.golemdb.io/rpc
GOLEM_PROJECT_ID=your_project_id
GOLEM_API_KEY=your_api_key

Wallet Configuration

STORE_WALLET_ADDRESS=0xYourStoreWalletAddress
USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e792954Da7Dfd334fF160

Security

JWT_SECRET=your_super_secret_jwt_key
ADMIN_BOOTSTRAP_EMAIL=admin@example.com
ADMIN_BOOTSTRAP_PASSWORD=secure_admin_password

Server

PORT=3000
NODE_ENV=development
```
### Initial Setup
```bash
Test the setup

bun run scripts/testSetup.ts

Create admin user

bun run scripts/createAdmin.ts

Start development server

bun run dev
```
## 🎯 API Endpoints

### Public Endpoints
- `GET /api/videos` - List all videos
- `GET /api/videos/:id` - Get video details
- `GET /api/tarot/cards` - List all tarot cards
- `GET /api/tarot/cards/:id` - Get tarot card details
- `GET /api/subscriptions/tiers` - List subscription tiers

### Authentication Required
- `GET /api/videos/:id/content` - Get secure video content
- `GET /api/user/videos` - List user's purchased videos
- `GET /api/subscriptions/status` - Get subscription status

### Whitelist Required
- `POST /api/tarot/draw` - Draw a tarot card
- `POST /api/readings` - Save tarot reading
- `GET /api/readings` - List reading history
- `POST /api/purchases/video` - Purchase a video
- `POST /api/purchases/subscription` - Purchase subscription

### Admin Endpoints
- `POST /api/admin/videos` - Create video
- `PUT /api/admin/videos/:id` - Update video
- `POST /api/admin/cards` - Create tarot card
- `POST /api/admin/subscription-tiers` - Create subscription tier
- `POST /api/admin/users/whitelist` - Add user to whitelist

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: User, admin, and whitelist controls
- **Payment Verification**: On-chain transaction validation
- **Data Encryption**: Personal data encryption for GDPR compliance
- **Input Validation**: Comprehensive request validation

## 🧪 Testing
```bash
Run setup verification

bun run scripts/testSetup.ts

Run development server

bun run dev

Build for production

bun run build
```
## 🚀 Deployment

1. Ensure all environment variables are set
2. Run `bun run build` to compile TypeScript
3. Start with `bun run start`
4. Configure reverse proxy (nginx, etc.) for production

## 📚 Development Guidelines

### Adding New Features

1. Create service in `src/services/`
2. Add controller in `src/controllers/`
3. Register routes in `src/server.ts`
4. Add appropriate middleware protection
5. Update types in `src/types/index.ts`

### Database Operations

- Use `GolemDBService` for all database interactions
- Follow entity creation patterns with annotations
- Implement proper error handling
- Use query syntax with double quotes for strings

## 🆘 Troubleshooting

### Common Issues

1. **GolemDB Connection Failed**: Ensure golembase-demo-cli is properly set up
2. **Wallet Not Found**: Verify wallet.json exists in XDG config directory
3. **Payment Verification Errors**: Check Base Sepolia network connectivity
4. **Permission Denied**: Ensure user is whitelisted for premium features

### Getting Help

- Check console logs for detailed error messages
- Verify environment variables are correctly set
- Ensure all prerequisites are installed
- Consult GolemDB and Base documentation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create pull request

## 📄 License

GPLv3 License - see LICENSE file for details

## 🙏 Acknowledgments

- [GolemDB](https://golem-base.io) - Decentralized database infrastructure
- [Base](https://base.org) - Ethereum L2 scaling solution
- [Base Minikit](https://docs.base.org/minikit-docs/) - Payment integration tools
