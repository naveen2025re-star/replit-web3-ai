# AI-Based Web3 Smart Contract Auditor

A comprehensive, AI-powered smart contract security analysis platform featuring a ChatGPT-style interface, real-time streaming responses, Web3 authentication, and community features for blockchain developers.

## 🚀 Features

### Core Functionality
- **AI-Powered Analysis**: Advanced smart contract vulnerability detection using Shipable AI API
- **Real-time Streaming**: ChatGPT-like interface with live analysis results
- **Multi-Language Support**: Solidity, Rust, Go, and other blockchain languages
- **File Upload**: Support for multiple contract files with drag-and-drop interface
- **Export & Share**: Download audit reports as markdown files

### Security Analysis Capabilities
- **Vulnerability Detection**:
  - Reentrancy attacks
  - Integer overflow/underflow
  - Access control issues
  - Gas limit problems
  - Front-running vulnerabilities
  - Timestamp dependencies
  - DoS attacks

- **Gas Optimization**:
  - Storage optimization strategies
  - Function efficiency analysis
  - Loop optimization recommendations
  - Data packing strategies
  - Cost reduction techniques

- **Code Quality Assessment**:
  - Best practices compliance
  - Code structure analysis
  - Documentation quality
  - Upgrade patterns review

### User Experience
- **Template Gallery**: Pre-built contract examples (ERC-20, DeFi, NFT marketplace)
- **Smart Contract Templates**: Click-to-load vulnerable contract examples
- **Visual Insights**: Automatic detection badges for security issues and optimizations
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark Theme**: Developer-friendly interface

### Web3 Integration
- **Wallet Authentication**: MetaMask and WalletConnect support
- **Session Management**: Persistent audit history per user
- **Community Features**: Public/private audit sharing
- **Audit History**: Complete analysis timeline with search

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
client/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── sophisticated-sidebar.tsx
│   │   └── ui/              # shadcn/ui components
│   ├── pages/               # Main application pages
│   │   ├── auditor.tsx      # Main audit interface
│   │   ├── community.tsx    # Community audits
│   │   ├── audit-history.tsx
│   │   └── auth.tsx         # Web3 authentication
│   ├── hooks/               # Custom React hooks
│   │   ├── useWeb3Auth.ts   # Web3 authentication
│   │   └── use-toast.ts     # Toast notifications
│   ├── lib/                 # Utility libraries
│   │   ├── shipable-api.ts  # AI API integration
│   │   └── queryClient.ts   # React Query setup
│   └── styles/              # Styling and themes
```

**Key Technologies:**
- **React 18**: Latest React with hooks and concurrent features
- **TypeScript**: Full type safety across the application
- **Vite**: Fast development and optimized builds
- **Tailwind CSS**: Utility-first styling with custom design system
- **shadcn/ui**: High-quality component library with Radix primitives
- **React Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **React Markdown**: Rich formatting for audit reports

### Backend (Node.js + Express)
```
server/
├── index.ts                 # Application entry point
├── routes.ts               # API route definitions
├── storage.ts              # Data persistence layer
├── db.ts                   # Database configuration
└── vite.ts                 # Development server integration
```

**API Endpoints:**
```
Authentication:
POST /api/auth/generate-nonce    # Generate Web3 nonce
POST /api/auth/web3              # Verify Web3 signature
GET  /api/auth/user             # Get current user

Audit Management:
POST /api/audit/analyze          # Start new analysis
GET  /api/audit/session/:id     # Get audit session
PUT  /api/audit/session/:id     # Update session details
DELETE /api/audit/session/:id   # Delete session
GET  /api/audit/user-sessions/:userId # User's audit history

Community Features:
GET  /api/community/audits       # Public audits
GET  /api/community/trending-tags # Popular tags
POST /api/community/audit        # Share audit publicly
```

### Database Schema (PostgreSQL + Drizzle ORM)
```sql
-- Users table for Web3 authentication
users (
  id: varchar (primary key)
  wallet_address: varchar (unique)
  created_at: timestamp
  updated_at: timestamp
)

-- Audit sessions
audit_sessions (
  id: varchar (primary key)
  user_id: varchar (foreign key)
  title: varchar
  contract_language: varchar
  visibility: enum ('private', 'public')
  created_at: timestamp
  updated_at: timestamp
)

-- Audit results and analysis data
audit_results (
  id: varchar (primary key)
  session_id: varchar (foreign key)
  analysis_content: text
  vulnerability_count: integer
  severity_level: varchar
  created_at: timestamp
)
```

## 🤖 AI Analysis Integration

### Shipable AI API Integration
The application uses a sophisticated two-step process for AI-powered analysis:

**Step 1: Session Creation**
```typescript
// Create analysis session
const response = await fetch('https://api.shipable.ai/v2/chat/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    source: 'website',
    context: 'smart_contract_security_analysis'
  })
});
```

**Step 2: Streaming Analysis**
```typescript
// Stream real-time analysis results
const eventSource = new EventSource(
  `https://api.shipable.ai/v2/chat/sessions/${sessionId}/stream?message=${encodeURIComponent(contractCode)}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update UI with streaming analysis
  updateAnalysisDisplay(data.content);
};
```

### Analysis Capabilities

**Security Vulnerability Detection:**
- Static code analysis for common smart contract vulnerabilities
- Pattern recognition for known attack vectors
- Compliance checking against security standards
- Risk assessment and severity scoring

**Gas Optimization Analysis:**
- Storage layout optimization
- Function call optimization
- Loop and iteration improvements
- Data structure recommendations

**Code Quality Assessment:**
- Best practices compliance
- Documentation quality
- Upgrade pattern analysis
- Maintainability scoring

## 🛠️ Setup and Installation

### Prerequisites
- Node.js 18+ (with npm)
- PostgreSQL database
- Shipable AI API key

### Environment Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/smartaudit_db
PGHOST=localhost
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_password
PGDATABASE=smartaudit_db

# AI API Configuration
SHIPABLE_AI_API_KEY=your_shipable_ai_key

# Application Configuration
NODE_ENV=development
PORT=5000
```

### Installation Steps

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd smart-contract-auditor
npm install
```

2. **Database Setup**
```bash
# Create database
createdb smartaudit_db

# Run migrations
npm run db:push
```

3. **Development Server**
```bash
# Start development server (frontend + backend)
npm run dev

# The application will be available at http://localhost:5000
```

4. **Production Build**
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Development

### Project Structure
```
├── client/                 # Frontend React application
├── server/                 # Backend Express server
├── shared/                 # Shared types and schemas
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── drizzle.config.ts      # Database configuration
└── tsconfig.json          # TypeScript configuration
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Push schema changes to database
npm run db:studio    # Open database studio
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint
```

### Development Workflow
1. **Frontend Development**: Hot reload with Vite
2. **Backend Development**: Auto-restart with tsx
3. **Database Changes**: Use Drizzle ORM migrations
4. **Type Safety**: Shared types between frontend and backend

## 📊 Performance

### Optimization Features
- **Code Splitting**: Lazy loading of components
- **Caching**: React Query for API response caching
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: Optimized asset loading
- **Database Indexing**: Optimized queries for audit history

### Monitoring
- Real-time performance metrics
- Error tracking and logging
- Database query optimization
- API response time monitoring

## 🔐 Security

### Authentication
- **Web3 Wallet Integration**: MetaMask, WalletConnect
- **Signature Verification**: Cryptographic proof of ownership
- **Session Management**: Secure session handling
- **CSRF Protection**: Cross-site request forgery prevention

### Data Protection
- **Input Validation**: All user inputs sanitized
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **Rate Limiting**: API endpoint protection

## 🌐 Deployment

### Replit Deployment
The application is optimized for Replit deployment with:
- Automatic environment configuration
- Integrated database hosting
- Zero-config deployment
- Automatic HTTPS and custom domains

### Production Considerations
- Environment variable management
- Database backup and recovery
- Monitoring and alerting
- Performance optimization
- Security hardening

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript strict mode
2. Use functional components with hooks
3. Implement proper error handling
4. Write comprehensive tests
5. Follow the existing code style

### Code Quality
- **ESLint**: Code linting and formatting
- **TypeScript**: Strict type checking
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Shipable AI API Documentation](https://docs.shipable.ai)
- [Web3 Authentication Guide](https://wagmi.sh)
- [React Query Documentation](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**Built with ❤️ for the Web3 community**

This comprehensive smart contract auditor provides developers with the tools they need to build secure, efficient, and reliable blockchain applications. Whether you're working on DeFi protocols, NFT marketplaces, or custom smart contracts, our AI-powered analysis helps you identify vulnerabilities and optimize your code before deployment.