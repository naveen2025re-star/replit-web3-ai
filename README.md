# SmartAudit AI - Advanced Smart Contract Security Analysis Platform

## Overview

SmartAudit AI is a comprehensive, production-ready web application that provides AI-powered smart contract auditing services. The platform features a ChatGPT-like interface for real-time security analysis, GitHub integration for automated workflows, community sharing capabilities, and integrated payment processing for credit-based usage.

## 🚀 Key Features

### Core Auditing Features
- **AI-Powered Analysis**: Advanced smart contract vulnerability detection using Shipable AI
- **Real-time Streaming**: ChatGPT-like interface with Server-Sent Events for live analysis
- **Multi-Network Support**: Ethereum, Polygon, BSC, and other EVM-compatible networks
- **Manual & GitHub Integration**: Direct contract input or automated GitHub repository analysis
- **Comprehensive Reports**: Detailed security analysis with severity ratings and recommendations

### User Management & Authentication
- **Web3 Authentication**: Secure wallet-based login system
- **User Profiles**: Personalized dashboards with audit history
- **Credit System**: Flexible credit-based pricing model
- **Professional Settings**: Customizable analysis preferences and notifications

### Payment & Billing
- **Razorpay Integration**: Secure payment processing with multiple payment methods
- **Automated Credit Addition**: Seamless credit top-ups with instant activation
- **Enterprise Packages**: Scalable pricing tiers for different usage levels
- **Payment Security**: HMAC signature verification and fraud prevention

### Community & Collaboration
- **Public Audit Sharing**: Community-driven security knowledge sharing
- **Audit History**: Complete audit trail with downloadable reports
- **Professional Network**: Connect with security researchers and developers

### Developer Experience
- **GitHub Integration**: Direct repository analysis and automated workflows
- **API Access**: RESTful API for programmatic access
- **Webhook Support**: Real-time notifications for audit completions
- **Export Capabilities**: Multiple report formats (PDF, JSON, markdown)

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18**: Modern functional components with hooks
- **TypeScript**: Full type safety across the application
- **Vite**: Fast build tool with Hot Module Replacement
- **Wouter**: Lightweight client-side routing
- **TanStack Query**: Advanced server state management with caching
- **shadcn/ui + Radix UI**: Accessible component library with consistent design
- **Tailwind CSS**: Utility-first styling with custom design system
- **Framer Motion**: Smooth animations and transitions

### Backend Stack
- **Node.js + Express**: Scalable server architecture
- **TypeScript**: End-to-end type safety
- **PostgreSQL**: Robust relational database with Neon hosting
- **Drizzle ORM**: Type-safe database operations with migrations
- **Passport.js**: Authentication middleware with Web3 support
- **Express Session**: Secure session management with database storage

### External Integrations
- **Shipable AI API**: Core smart contract analysis engine
- **GitHub API**: Repository access and webhook management
- **Razorpay**: Payment processing and subscription management
- **Etherscan/Polygonscan**: Blockchain data and contract verification
- **Web3 Providers**: Multi-wallet support (MetaMask, WalletConnect, etc.)

### Security & Performance
- **HMAC Signature Verification**: Payment security and API authentication
- **Rate Limiting**: API protection and abuse prevention
- **Error Boundaries**: Comprehensive error handling and recovery
- **Service Worker**: Offline support and performance caching
- **SEO Optimization**: Meta tags, structured data, and accessibility
- **PWA Support**: Mobile app-like experience with offline capabilities

## 📁 Project Structure

```
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── CreditDisplay.tsx
│   │   │   ├── SimpleRazorpayButton.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ...
│   │   ├── pages/             # Route components
│   │   │   ├── landing.tsx
│   │   │   ├── auditor.tsx
│   │   │   ├── settings.tsx
│   │   │   └── ...
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities and configurations
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   └── App.tsx            # Main application component
│   ├── public/                # Static assets and PWA files
│   │   ├── manifest.json
│   │   └── sw.js              # Service worker
│   └── index.html             # Main HTML template
├── server/                     # Backend Express application
│   ├── routes.ts              # API route definitions
│   ├── db.ts                  # Database connection
│   ├── storage.ts             # Data access layer
│   ├── razorpay.ts           # Payment processing
│   ├── creditService.ts      # Credit management
│   └── index.ts              # Server entry point
├── shared/                     # Shared types and schemas
│   └── schema.ts              # Drizzle database schema
└── README.md                  # This file
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Razorpay account for payments
- GitHub OAuth app (optional)

### Environment Variables
Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database
PGHOST=localhost
PGPORT=5432
PGUSER=your_user
PGPASSWORD=your_password
PGDATABASE=your_database

# Payment Processing
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_secret_key

# Blockchain APIs (optional)
ETHERSCAN_API_KEY=your_etherscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key

# Session Secret
SESSION_SECRET=your_secure_session_secret
```

### Installation & Running

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   npm run db:push
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

### Build for Production

```bash
npm run build
npm start
```

## 🗄️ Database Schema

### Core Tables

#### Users
- `id`: Primary key (UUID)
- `walletAddress`: Unique wallet identifier
- `email`: User email (optional)
- `username`: Display name
- `profileImage`: Avatar URL
- `createdAt`, `updatedAt`: Timestamps

#### Credits
- `id`: Primary key
- `userId`: Foreign key to users
- `balance`: Current credit amount
- `totalPurchased`: Lifetime credit purchases
- `lastUpdated`: Timestamp

#### AuditSessions
- `id`: Primary key (UUID)
- `userId`: Foreign key to users
- `contractAddress`: Smart contract address
- `network`: Blockchain network
- `status`: Analysis status
- `isPublic`: Community sharing flag
- `createdAt`: Timestamp

#### AuditResults
- `id`: Primary key
- `sessionId`: Foreign key to audit sessions
- `analysis`: JSON analysis results
- `vulnerabilities`: Structured vulnerability data
- `recommendations`: Security recommendations
- `severity`: Risk level assessment

#### PaymentTransactions
- `id`: Primary key
- `userId`: Foreign key to users
- `razorpayOrderId`: Payment gateway reference
- `amount`: Payment amount
- `creditsAdded`: Credits granted
- `status`: Transaction status
- `createdAt`: Timestamp

## 🔌 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - Web3 wallet authentication
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user info

### Audit Endpoints
- `POST /api/audits` - Create new audit session
- `GET /api/audits` - Get user audit history
- `GET /api/audits/:id` - Get specific audit details
- `DELETE /api/audits/:id` - Delete audit session

### Credit Management
- `GET /api/credits` - Get user credit balance
- `POST /api/credits/purchase` - Purchase credits
- `GET /api/credits/history` - Credit transaction history

### Payment Processing
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment completion
- `GET /api/payments/history` - Payment transaction history

### Community Features
- `GET /api/community/audits` - Get public audits
- `POST /api/audits/:id/share` - Share audit publicly
- `GET /api/community/stats` - Community statistics

## 🔒 Security Features

### Payment Security
- HMAC SHA-256 signature verification for all payments
- Duplicate transaction prevention
- Amount manipulation protection
- Secure webhook handling

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers
- CSRF token validation

### Data Protection
- Encrypted session storage
- Secure cookie configuration
- Environment variable protection
- Database connection encryption

## 📱 Progressive Web App (PWA)

The application includes full PWA support:
- **Offline Functionality**: Core features work without internet
- **App-like Experience**: Can be installed on mobile devices
- **Background Sync**: Queued actions when connection returns
- **Push Notifications**: Real-time audit completion alerts
- **Responsive Design**: Optimized for all screen sizes

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Payment webhooks configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented

### Replit Deployment
The application is optimized for Replit deployment with automatic configuration for:
- Database provisioning
- Environment management
- SSL termination
- Continuous deployment

## 📊 Performance Optimizations

### Frontend Optimizations
- Code splitting with dynamic imports
- Image optimization and lazy loading
- Bundle size optimization
- React Query caching strategies
- Service worker caching

### Backend Optimizations
- Database connection pooling
- Query optimization with indexing
- Response compression
- Static asset serving
- Memory usage monitoring

## 🧪 Testing

### Testing Strategy
- Unit tests for critical functions
- Integration tests for API endpoints
- End-to-end tests for user workflows
- Payment flow testing
- Security vulnerability scanning

### Running Tests
```bash
npm test              # Run unit tests
npm run test:e2e      # Run end-to-end tests
npm run test:security # Security scanning
```

## 📈 Monitoring & Analytics

### Application Monitoring
- Error tracking and reporting
- Performance metrics
- User analytics
- Payment transaction monitoring
- API usage statistics

### Health Checks
- Database connectivity
- External API availability
- Payment gateway status
- Memory and CPU usage

## 🔧 Configuration

### Feature Flags
The application supports feature flags for gradual rollouts:
- Community features
- Payment methods
- Experimental AI models
- Beta features

### Customization
- Branding and theming
- Payment gateway selection
- AI model configuration
- Rate limiting adjustments

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

For contribution guidelines and development standards, please contact the development team.

## 📞 Support

For technical support or questions:
- Email: support@smartaudit.ai
- Documentation: [docs.smartaudit.ai](https://docs.smartaudit.ai)
- Status Page: [status.smartaudit.ai](https://status.smartaudit.ai)

---

**SmartAudit AI** - Securing the future of Web3 with advanced AI-powered smart contract analysis.
