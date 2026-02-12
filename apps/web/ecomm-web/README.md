# Nex-Shop E-Commerce Web

The modern, responsive frontend for the Nex-Shop e-commerce platform, built with Next.js 15.

## Features

- **Product Catalog**: Dynamic product listing with category filtering and search.
- **Shopping Cart**: Real-time cart management with guest and user session support.
- **User Authentication**: Secure login and registration integrated with Auth API.
- **Checkout Flow**: Seamless multi-step checkout with payment integration.
- **Order History**: View past orders and current order status.
- **Responsive Design**: Optimized for mobile, tablet, and desktop using Tailwind CSS 4.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: React Context API
- **Icons**: Lucide React
- **Testing**:
  - **Unit**: Vitest + React Testing Library
  - **E2E**: Playwright
- **Package Manager**: pnpm

## Architecture

```
src/
├── app/              # Next.js App Router pages and layouts
├── components/       # Reusable UI components (cart, checkout, product, etc.)
├── context/          # Global application state (AppContext)
├── services/         # API client services (auth, cart, order, product)
├── types/            # TypeScript interfaces and types
└── utils/            # Helper functions and constants
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- APIs running (see [Monorepo README](../../README.md))

### Installation

```bash
pnpm install
```

### Development

#### 1. Start APIs

Ensure the backend services (Auth, Product, etc.) are running. You can start them in the respective directories or via the root infrastructure setup.

#### 2. Run the Web Application

```bash
# Start against local development APIs
pnpm dev

# Start against LocalStack deployed APIs
pnpm dev:localstack
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Testing

### Running Tests

```bash
# Run unit tests (Vitest)
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Run coverage report
pnpm test:coverage

# Run E2E tests (Playwright)
pnpm test:e2e
```

## Deployment

The web application is set up for deployment via Vercel or as a static build.

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## 📝 License

UNLICENSED - Private project
