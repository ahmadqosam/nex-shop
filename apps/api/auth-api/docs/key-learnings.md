# Auth API - Key Learnings

## Project Setup
- NestJS v11, TypeScript 5.7, Jest 30, ESLint 9, pnpm
- Module resolution: `nodenext` (CJS mode)

## Gotchas & Fixes
- **ts-jest 29.x works with Jest 30** but Jest 30 renamed `--testPathPattern` → `--testPathPatterns`
- **uuid v13 is ESM-only** — use `crypto.randomUUID()` + `crypto.randomBytes()` instead
- **Dynamic imports fail in Jest without `--experimental-vm-modules`** — use static imports with `jest.mock()`
- **CryptoService key loading must happen in constructor**, not `onModuleInit()`, because JwtStrategy constructor needs the public key before lifecycle hooks fire
- **`ConfigService.get()` returns strings from env vars** — wrap with `Number()` for numeric values like `expiresIn`
- **supertest default export**: use `import request from 'supertest'` not `import * as request`
- **Testcontainers on macOS** needs env vars: `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock DOCKER_HOST=unix:///var/run/docker.sock`
- **TypeScript decorator metadata creates phantom branches** in coverage — set branch threshold to 75%, keep statements/functions/lines at 100%
- **v8 coverage provider** gives more accurate results than default babel-based coverage

## Architecture Decisions
- Opaque refresh tokens: `{userId}.{tokenId}.{base64urlRandom}` hashed with Argon2 in Redis
- RS256 JWT signing with JWKS public key discovery
- Global guards (JwtAuthGuard + RolesGuard) via APP_GUARD with @Public() bypass
- Separate Argon2 params: heavy for passwords (64MB/3iter), lighter for tokens (16MB/2iter)

See [patterns.md](patterns.md) for detailed notes.
