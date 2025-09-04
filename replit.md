# AI-Based Web3 Smart Contract Auditor

## Overview

This is a full-stack web application that provides AI-powered smart contract auditing services. The application allows users to paste smart contract code and receive comprehensive security analysis powered by the Shipable AI API. The system features a ChatGPT-like interface with real-time streaming responses, making smart contract security analysis accessible through an intuitive web interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React with TypeScript**: The client-side application is built using React 18 with TypeScript for type safety and better development experience. The application uses a modern component-based architecture with functional components and hooks.

**UI Framework**: Implements shadcn/ui component library with Radix UI primitives, providing a consistent and accessible design system. The UI features a dark theme optimized for code analysis workflows, similar to popular developer tools.

**Styling**: Uses Tailwind CSS for utility-first styling with custom CSS variables for theming. The design system includes custom color schemes, typography scales, and component variants optimized for technical content.

**State Management**: Utilizes React Query (TanStack Query) for server state management, providing caching, background updates, and optimistic UI updates for API interactions.

**Routing**: Implements Wouter for lightweight client-side routing, keeping the bundle size minimal while providing necessary navigation capabilities.

### Backend Architecture

**Express.js Server**: Node.js backend built with Express.js, configured for both development and production environments with proper middleware setup for JSON parsing, CORS, and request logging.

**TypeScript Configuration**: Full TypeScript support across the entire codebase with shared type definitions between client and server, ensuring type safety across the application boundary.

**API Design**: RESTful API endpoints following conventional patterns with proper error handling and response formatting. The server includes middleware for request/response logging and error handling.

### Data Storage Solutions

**PostgreSQL Database**: Uses PostgreSQL as the primary database, configured to work with both local development and cloud deployments (Railway in production).

**Drizzle ORM**: Implements Drizzle ORM for type-safe database operations with TypeScript. The ORM configuration supports migrations and provides a developer-friendly query builder.

**Database Schema**: Structured schema including:
- Users table for authentication
- Audit sessions table for tracking analysis requests
- Audit results table for storing AI analysis outputs with structured vulnerability data

### External Service Integrations

**Shipable AI API**: Core integration with Shipable AI for smart contract analysis. The system implements a two-step process:
1. Session creation via POST to `/v2/chat/sessions` with website source
2. Streaming analysis via Server-Sent Events for real-time results

**Neon Database**: Uses Neon serverless PostgreSQL for cloud database hosting with WebSocket support for optimal performance.

**Real-time Communication**: Implements Server-Sent Events (SSE) for streaming AI analysis results to the client, providing a responsive user experience similar to ChatGPT.

### Development and Build Tools

**Vite**: Modern build tool providing fast development server with Hot Module Replacement (HMR) and optimized production builds.

**ESBuild**: Used for server-side code bundling and compilation, providing fast build times for the Node.js backend.

**Development Environment**: Configured for Replit deployment with proper environment variable management and development/production configuration separation.

**Code Quality**: TypeScript strict mode enabled across the entire codebase with path mapping for clean imports and proper module resolution.