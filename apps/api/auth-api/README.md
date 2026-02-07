# Auth API

A production-ready authentication microservice built with NestJS, featuring JWT-based authentication with refresh tokens, role-based access control, and enterprise-grade security.

## 🚀 Features

- **JWT Authentication** with RS256 signing and JWKS public key discovery
- **Opaque Refresh Tokens** with Argon2 hashing stored in Redis
- **Role-Based Access Control (RBAC)** with global guards
- **User Management** with PostgreSQL and TypeORM
- **Serverless Ready** with AWS Lambda support
- **100% Test Coverage** (statements, functions, lines) with 75% branch coverage
- **Production-Grade Security** with separate Argon2 parameters for passwords and tokens

## 📋 Tech Stack

- **Framework**: NestJS v11
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL (with TypeORM)
- **Cache/Sessions**: Redis (ioredis)
- **Testing**: Jest 30, ts-jest 29, Testcontainers
- **Security**: Argon2, RS256 JWT, Passport
- **Package Manager**: pnpm
- **Linting**: ESLint 9
- **Deployment**: Serverless Framework, AWS Lambda

## 🏗️ Architecture

### Authentication Flow

1. **Login**: User credentials are validated, password hashed with Argon2 (64MB/3iter)
2. **Token Generation**:
   - Access token: RS256 JWT with user claims
   - Refresh token: Opaque token format `{userId}.{tokenId}.{base64urlRandom}` hashed with Argon2 (16MB/2iter) and stored in Redis
3. **Authorization**: Global `JwtAuthGuard` + `RolesGuard` with `@Public()` decorator bypass
4. **Token Refresh**: Exchange refresh token for new access token
5. **JWKS Endpoint**: Public key discovery for JWT verification

### Module Structure

```
src/
├── auth/          # Authentication logic, guards, strategies
├── users/         # User management and entities
├── crypto/        # Cryptographic utilities (Argon2, key management)
├── jwks/          # JWKS endpoint for public key discovery
├── redis/         # Redis client and session management
├── database/      # TypeORM configuration and migrations
├── config/        # Environment configuration with Joi validation
└── common/        # Shared decorators, filters, pipes
```

### Database Schema

The service uses PostgreSQL to store user information. The primary `users` table has the following structure:

| Field          | Type           | Description                            |
| -------------- | -------------- | -------------------------------------- |
| `id`           | `uuid`         | Primary Key, auto-generated            |
| `email`        | `varchar(255)` | Unique, Indexed, user login identifier |
| `name`         | `varchar(255)` | Optional display name (nullable)       |
| `passwordHash` | `varchar(255)` | Argon2 hash of the user password       |
| `roles`        | `varchar[]`    | Array of roles (e.g., `USER`, `ADMIN`) |
| `createdAt`    | `timestamptz`  | Record creation timestamp              |
| `updatedAt`    | `timestamptz`  | Record last update timestamp           |

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for local development with PostgreSQL and Redis)
- OpenSSL (for generating RSA keys)

### Installation

```bash
# Install dependencies
pnpm install

# Generate RSA key pair for JWT signing
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```bash
# Application
NODE_ENV=development
PORT=4001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=auth_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_TOKEN_EXPIRES_IN=900        # 15 minutes
JWT_REFRESH_TOKEN_EXPIRES_IN=604800    # 7 days
```

### Running Locally

#### 1. Start Infrastructure Services

Make sure Docker is running, then start PostgreSQL, Redis, and LocalStack:

```bash
docker-compose up -d
```

Verify containers are running:

```bash
docker-compose ps
```

You should see `postgres`, `redis`, and `localstack` containers in "Up" status.

#### 2. Run Database Migrations

```bash
pnpm migration:run
```

#### 3. Start the Development Server

```bash
pnpm start:dev
```

The API will be available at `http://localhost:4001`.

#### Troubleshooting

**"Unable to connect to the database" / ECONNREFUSED errors:**

This means PostgreSQL or Redis containers are not running. Run:

```bash
docker-compose up -d
```

Wait a few seconds for services to initialize, then try again.

## 🧪 Testing

### Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:cov
```

### Test Environment Setup (macOS)

For Testcontainers to work on macOS, set these environment variables:

```bash
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
export DOCKER_HOST=unix:///var/run/docker.sock
```

### Coverage Thresholds

- **Statements, Functions, Lines**: 100%
- **Branches**: High coverage (some branches excluded due to TypeScript decorator metadata)

## 📚 Key Learnings & Gotchas

### Testing

- **Jest 30 + ts-jest 29**: Works together, but Jest 30 renamed `--testPathPattern` → `--testPathPatterns`
- **Dynamic imports**: Fail in Jest without `--experimental-vm-modules` — use static imports with `jest.mock()` instead
- **v8 coverage provider**: More accurate than default babel-based coverage
- **Coverage thresholds**: Set branch threshold to 75% due to TypeScript decorator metadata

### Dependencies

- **uuid v13**: ESM-only — replaced with `crypto.randomUUID()` and `crypto.randomBytes()`
- **supertest**: Use `import request from 'supertest'` not `import * as request`

### NestJS Patterns

- **CryptoService initialization**: Key loading must happen in constructor, not `onModuleInit()`, because `JwtStrategy` constructor needs the public key before lifecycle hooks fire
- **ConfigService types**: `ConfigService.get()` returns strings from env vars — wrap with `Number()` for numeric values
- **Global guards**: Use `APP_GUARD` provider with `@Public()` decorator for bypass

### Security

- **Argon2 parameters**:
  - Passwords: Heavy (64MB memory, 3 iterations)
  - Refresh tokens: Lighter (16MB memory, 2 iterations)
- **Opaque tokens**: Format `{userId}.{tokenId}.{base64urlRandom}` prevents token enumeration
- **RS256 signing**: Asymmetric keys allow public verification without exposing signing key

## 🚢 Deployment

### Serverless (AWS Lambda)

```bash
# Build for Lambda
pnpm build:lambda

# Deploy to local (LocalStack)
pnpm deploy:local

# Deploy to AWS
serverless deploy --stage production
```

### Database Migrations

```bash
# Generate migration
pnpm migration:generate src/migrations/MigrationName

# Run migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert
```

### Adding New Database Attributes

Follow these steps to add a new field to an entity:

#### 1. Update the Entity

Edit the entity file (e.g., `src/users/entities/user.entity.ts`):

```typescript
// Add the new column with definite assignment assertion (!)
@Column({ type: 'varchar', length: 255, nullable: true })
newField!: string | null;
```

> **Note**: Use `!` (definite assignment assertion) on all entity properties for TypeScript strict mode compatibility.

#### 2. Update DTOs

Update the relevant DTOs to include the new field:

- **Create DTO** (`src/users/dto/create-user.dto.ts`):

  ```typescript
  newField?: string;
  ```

- **Request DTO** (e.g., `src/auth/dto/register.dto.ts`):
  ```typescript
  @ApiProperty({ example: 'Example value', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  newField?: string;
  ```

#### 3. Update Services

Pass the new field through services that create/update the entity:

```typescript
const user = await this.usersService.create({
  email: dto.email,
  passwordHash,
  roles: [Role.USER],
  newField: dto.newField, // Add this
});
```

#### 4. Update Tests

Update mock objects in test files to include the new field:

```typescript
const mockUser: User = {
  id: 'uuid-123',
  email: 'test@example.com',
  newField: null, // Add this
  // ... other fields
};
```

#### 5. Generate and Run Migration

```bash
# Ensure Docker services are running
docker-compose up -d

# Generate migration (creates a new file in src/migrations/)
pnpm migration:generate src/migrations/AddNewFieldToUsers

# Run the migration
pnpm migration:run
```

#### 6. Update Documentation

Add the new field to the Database Schema table in this README.

#### 7. Verify

```bash
# Run tests to ensure nothing is broken
pnpm test
pnpm test:e2e
```

## 📖 API Documentation

When running in development mode, Swagger documentation is available at:

- **Swagger UI**: `http://localhost:4001/api/docs`
- **OpenAPI JSON**: `http://localhost:4001/api/docs-json`

## 🔐 Security Considerations

- Private keys should never be committed to version control
- Use environment-specific `.env` files
- Rotate JWT signing keys periodically
- Set appropriate token expiration times
- Use HTTPS in production
- Implement rate limiting for authentication endpoints
- Monitor failed login attempts

## 📝 License

UNLICENSED - Private project

## 🤝 Contributing

This is a private project. For questions or issues, please contact the development team.

---
