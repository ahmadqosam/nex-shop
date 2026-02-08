#!/bin/bash
set -e

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
APPS_API_DIR="$ROOT_DIR/apps/api"

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}${BOLD}  NestJS Microservice Scaffolder${NC}"
echo -e "${BLUE}  ────────────────────────────────${NC}"
echo ""

# ─── 1. Service Name ─────────────────────────────────────────────────────────
while true; do
  read -rp "  Service name (kebab-case, e.g. order-api): " SERVICE_NAME
  if [[ "$SERVICE_NAME" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
    break
  fi
  echo -e "  ${RED}Invalid. Use lowercase letters, numbers, hyphens (must start with letter).${NC}"
done

if [ -d "$APPS_API_DIR/$SERVICE_NAME" ]; then
  echo -e "  ${RED}Error: apps/api/$SERVICE_NAME already exists.${NC}"
  exit 1
fi

# ─── 2. Description ──────────────────────────────────────────────────────────
read -rp "  Description: " SERVICE_DESC

# ─── 3. Port (auto-detect) ───────────────────────────────────────────────────
HIGHEST_PORT=4000
for f in "$APPS_API_DIR"/*/.env.example; do
  [ -f "$f" ] || continue
  P=$(grep "^PORT=" "$f" 2>/dev/null | cut -d= -f2)
  [ -n "$P" ] && [ "$P" -gt "$HIGHEST_PORT" ] && HIGHEST_PORT=$P
done
NEXT_PORT=$((HIGHEST_PORT + 1))

read -rp "  Port [${NEXT_PORT}]: " PORT
PORT=${PORT:-$NEXT_PORT}

# ─── 4. Prisma ───────────────────────────────────────────────────────────────
read -rp "  Include Prisma (database)? [y/N]: " INCLUDE_PRISMA
INCLUDE_PRISMA=$(echo "${INCLUDE_PRISMA:-n}" | tr '[:upper:]' '[:lower:]')

# ─── 5. Redis ────────────────────────────────────────────────────────────────
read -rp "  Include Redis (cache)? [y/N]: " INCLUDE_REDIS
INCLUDE_REDIS=$(echo "${INCLUDE_REDIS:-n}" | tr '[:upper:]' '[:lower:]')

# ─── Derived values ──────────────────────────────────────────────────────────
SERVICE_SNAKE="${SERVICE_NAME//-/_}"
DB_USER="${SERVICE_SNAKE}_user"
DB_PASSWORD="${SERVICE_SNAKE}_password"
DB_NAME="${SERVICE_SNAKE}_db"
PORT_OFFSET=$((PORT - 4001))
PG_DEV_PORT=$((5432 + PORT_OFFSET))
REDIS_DEV_PORT=$((6379 + PORT_OFFSET))
LS_DEV_PORT=$((4566 + PORT_OFFSET))
SERVICE_TITLE=$(echo "$SERVICE_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}Configuration${NC}"
echo "  ─────────────────────────────"
echo "  Name:        $SERVICE_NAME"
echo "  Package:     $SERVICE_NAME"
echo "  Port:        $PORT"
echo "  Prisma:      $([ "$INCLUDE_PRISMA" = "y" ] && echo "Yes" || echo "No")"
echo "  Redis:       $([ "$INCLUDE_REDIS" = "y" ] && echo "Yes" || echo "No")"
if [ "$INCLUDE_PRISMA" = "y" ]; then
  echo "  Database:    $DB_NAME ($DB_USER)"
fi
echo ""

read -rp "  Continue? [Y/n]: " CONFIRM
CONFIRM=$(echo "${CONFIRM:-y}" | tr '[:upper:]' '[:lower:]')
if [ "$CONFIRM" != "y" ]; then
  echo "  Aborted."
  exit 0
fi

echo ""
echo -e "  ${GREEN}Generating service...${NC}"

# ─── Create directories ──────────────────────────────────────────────────────
D="$APPS_API_DIR/$SERVICE_NAME"
mkdir -p "$D/src/config" "$D/src/common/filters" "$D/test"
[ "$INCLUDE_PRISMA" = "y" ] && mkdir -p "$D/src/prisma" "$D/prisma"
[ "$INCLUDE_REDIS" = "y" ] && mkdir -p "$D/src/cache"

# ══════════════════════════════════════════════════════════════════════════════
# CONFIG FILES
# ══════════════════════════════════════════════════════════════════════════════

# ─── .prettierrc ──────────────────────────────────────────────────────────────
cat > "$D/.prettierrc" << 'EOF'
{
  "singleQuote": true,
  "trailingComma": "all"
}
EOF

# ─── nest-cli.json ────────────────────────────────────────────────────────────
cat > "$D/nest-cli.json" << 'EOF'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
EOF

# ─── tsconfig.json ────────────────────────────────────────────────────────────
cat > "$D/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true
  }
}
EOF

# ─── tsconfig.build.json ─────────────────────────────────────────────────────
cat > "$D/tsconfig.build.json" << 'EOF'
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
EOF

# ─── eslint.config.mjs ───────────────────────────────────────────────────────
cat > "$D/eslint.config.mjs" << 'ESLINTEOF'
// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
ESLINTEOF

# ─── test/jest-e2e.json ──────────────────────────────────────────────────────
cat > "$D/test/jest-e2e.json" << 'EOF'
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "testTimeout": 120000,
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
EOF

# ─── .env.example ─────────────────────────────────────────────────────────────
{
  echo "# Application"
  echo "PORT=$PORT"
  echo "NODE_ENV=development"
  if [ "$INCLUDE_PRISMA" = "y" ]; then
    echo ""
    echo "# Database (Prisma)"
    echo "DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}\""
  fi
  if [ "$INCLUDE_REDIS" = "y" ]; then
    echo ""
    echo "# Redis Cache"
    echo "REDIS_HOST=localhost"
    echo "REDIS_PORT=6379"
    echo "REDIS_PASSWORD="
    echo ""
    echo "# Cache TTL in seconds (default 5 minutes)"
    echo "CACHE_TTL=300"
  fi
  echo ""
  echo "# CORS"
  echo "CORS_ORIGIN=http://localhost:3000"
} > "$D/.env.example"

cp "$D/.env.example" "$D/.env"

# ─── package.json ─────────────────────────────────────────────────────────────
PRISMA_SCRIPTS=""
PRISMA_SEED_CONFIG=""
PRISMA_DEPS=""
PRISMA_DEVDEPS=""
REDIS_DEPS=""
TC_PG=""
TC_REDIS=""

if [ "$INCLUDE_PRISMA" = "y" ]; then
  PRISMA_SCRIPTS='
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:seed": "ts-node prisma/seed.ts",'
  PRISMA_SEED_CONFIG='
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },'
  PRISMA_DEPS='
    "@prisma/client": "^6.3.1",'
  PRISMA_DEVDEPS='
    "prisma": "^6.3.1",'
  TC_PG='
    "@testcontainers/postgresql": "^11.11.0",'
fi

if [ "$INCLUDE_REDIS" = "y" ]; then
  REDIS_DEPS='
    "ioredis": "^5.9.2",'
  TC_REDIS='
    "@testcontainers/redis": "^11.11.0",'
fi

cat > "$D/package.json" << PKGEOF
{
  "name": "${SERVICE_NAME}",
  "version": "0.0.1",
  "description": "${SERVICE_DESC}",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",${PRISMA_SCRIPTS}
    "build:lambda": "nest build",
    "deploy:local": "pnpm build:lambda && serverless deploy --stage local"
  },${PRISMA_SEED_CONFIG}
  "dependencies": {
    "@codegenie/serverless-express": "^4.17.1",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.3",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/swagger": "^11.2.6",${PRISMA_DEPS}
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.3",${REDIS_DEPS}
    "joi": "^18.0.2",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@eslint/js": "^9.18.0",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",${TC_PG}${TC_REDIS}
    "@types/aws-lambda": "^8.10.160",
    "@types/express": "^5.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^22.10.7",
    "@types/supertest": "^6.0.2",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
    "globals": "^16.0.0",
    "jest": "^30.0.0",
    "prettier": "^3.4.2",${PRISMA_DEVDEPS}
    "serverless": "3",
    "serverless-localstack": "^1.3.1",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "testcontainers": "^11.11.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.20.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\\\.spec\\\\.ts$",
    "transform": {
      "^.+\\\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s",
      "!main.ts",
      "!lambda.ts",
      "!**/*.module.ts",
      "!config/**",
      "!common/**",
      "!**/dto/**",
      "!**/index.ts"
    ],
    "coverageDirectory": "../coverage",
    "coverageThreshold": {
      "global": {
        "branches": 75,
        "functions": 100,
        "lines": 100,
        "statements": 100
      }
    },
    "testEnvironment": "node",
    "coverageProvider": "v8"
  }
}
PKGEOF

# ─── serverless.yml ──────────────────────────────────────────────────────────
{
  cat << SVREOF
service: ${SERVICE_NAME}

frameworkVersion: '3'

plugins:
  - serverless-localstack

custom:
  localstack:
    stages:
      - local
    host: http://localhost:${LS_DEV_PORT}
    edgePort: ${LS_DEV_PORT}

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  stage: \${opt:stage, 'local'}
  memorySize: 512
  timeout: 30
  environment:
    NODE_ENV: production
SVREOF
  if [ "$INCLUDE_PRISMA" = "y" ]; then
    echo "    DATABASE_URL: \${env:DATABASE_URL, 'postgresql://${DB_USER}:${DB_PASSWORD}@host.docker.internal:${PG_DEV_PORT}/${DB_NAME}'}"
  fi
  if [ "$INCLUDE_REDIS" = "y" ]; then
    echo "    REDIS_HOST: \${env:REDIS_HOST, 'host.docker.internal'}"
    echo "    REDIS_PORT: \${env:REDIS_PORT, '${REDIS_DEV_PORT}'}"
    echo "    REDIS_PASSWORD: \${env:REDIS_PASSWORD, ''}"
    echo "    CACHE_TTL: \${env:CACHE_TTL, '300'}"
  fi
  cat << 'SVREOF2'

functions:
  api:
    handler: dist/lambda.handler
    events:
      - http:
          method: ANY
          path: /
      - http:
          method: ANY
          path: '{proxy+}'

package:
  individually: true
  patterns:
    - '!src/**'
    - '!test/**'
SVREOF2
  [ "$INCLUDE_PRISMA" = "y" ] && echo "    - '!prisma/**'"
  echo "    - '!.env*'"
  echo "    - 'dist/**'"
  echo "    - 'node_modules/**'"
  [ "$INCLUDE_PRISMA" = "y" ] && echo "    - 'node_modules/.prisma/**'"
} > "$D/serverless.yml"

# ─── docker-compose.yml (per-service) ────────────────────────────────────────
{
  echo "services:"
  if [ "$INCLUDE_PRISMA" = "y" ]; then
    cat << DCPGEOF
  postgres:
    image: postgres:16-alpine
    ports:
      - '${PG_DEV_PORT}:5432'
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data

DCPGEOF
  fi
  if [ "$INCLUDE_REDIS" = "y" ]; then
    cat << DCRDEOF
  redis:
    image: redis:7-alpine
    ports:
      - '${REDIS_DEV_PORT}:6379'

DCRDEOF
  fi
  cat << DCLSEOF
  localstack:
    image: localstack/localstack:latest
    ports:
      - '${LS_DEV_PORT}:4566'
    environment:
      - SERVICES=lambda,apigateway,iam,logs,s3,cloudformation
      - DEBUG=1
    volumes:
      - '/var/run/docker.sock:/var/run/docker.sock'
DCLSEOF
  if [ "$INCLUDE_PRISMA" = "y" ]; then
    echo ""
    echo "volumes:"
    echo "  pgdata:"
  fi
} > "$D/docker-compose.yml"

# ══════════════════════════════════════════════════════════════════════════════
# SOURCE FILES
# ══════════════════════════════════════════════════════════════════════════════

# ─── src/main.ts ──────────────────────────────────────────────────────────────
cat > "$D/src/main.ts" << MAINEOF
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const port = configService.get<number>('PORT', ${PORT});

  const config = new DocumentBuilder()
    .setTitle('${SERVICE_TITLE}')
    .setDescription('${SERVICE_DESC}')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.getHttpAdapter().get('/api/docs-json', (_req: any, res: any) => {
    res.json(document);
  });

  await app.listen(port);
  console.log(\`${SERVICE_TITLE} is running on: \${await app.getUrl()}\`);
  console.log(\`Swagger docs: \${await app.getUrl()}/api/docs\`);
}
void bootstrap();
MAINEOF

# ─── src/lambda.ts ────────────────────────────────────────────────────────────
cat > "$D/src/lambda.ts" << LAMBDAEOF
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import serverlessExpress from '@codegenie/serverless-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import express from 'express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common';

let cachedHandler: Handler;

async function bootstrap(): Promise<Handler> {
  if (cachedHandler) {
    return cachedHandler;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn'],
  });

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('${SERVICE_TITLE}')
    .setDescription('${SERVICE_DESC}')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  expressApp.get('/api/docs-json', (_req, res) => {
    res.json(document);
  });

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  await app.init();
  cachedHandler = serverlessExpress({ app: expressApp });
  return cachedHandler;
}

export const handler: Handler = async (
  event: unknown,
  context: Context,
  callback: Callback,
) => {
  const server = await bootstrap();
  return server(event, context, callback);
};
LAMBDAEOF

# ─── src/app.module.ts ────────────────────────────────────────────────────────
{
  echo "import { Module } from '@nestjs/common';"
  echo "import { ConfigModule } from '@nestjs/config';"
  echo "import { AppController } from './app.controller';"
  echo "import { AppService } from './app.service';"
  [ "$INCLUDE_PRISMA" = "y" ] && echo "import { PrismaModule } from './prisma';"
  [ "$INCLUDE_REDIS" = "y" ] && echo "import { CacheModule } from './cache';"
  echo "import { configValidationSchema } from './config';"
  echo ""
  echo "@Module({"
  echo "  imports: ["
  echo "    ConfigModule.forRoot({"
  echo "      isGlobal: true,"
  echo "      validationSchema: configValidationSchema,"
  echo "      envFilePath: ['.env'],"
  echo "    }),"
  [ "$INCLUDE_PRISMA" = "y" ] && echo "    PrismaModule,"
  [ "$INCLUDE_REDIS" = "y" ] && echo "    CacheModule,"
  echo "  ],"
  echo "  controllers: [AppController],"
  echo "  providers: [AppService],"
  echo "})"
  echo "export class AppModule {}"
} > "$D/src/app.module.ts"

# ─── src/app.controller.ts ───────────────────────────────────────────────────
cat > "$D/src/app.controller.ts" << 'EOF'
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHello(): string {
    return this.appService.getHello();
  }
}
EOF

# ─── src/app.service.ts ──────────────────────────────────────────────────────
cat > "$D/src/app.service.ts" << 'EOF'
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'OK';
  }
}
EOF

# ─── src/app.controller.spec.ts ──────────────────────────────────────────────
cat > "$D/src/app.controller.spec.ts" << 'EOF'
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "OK"', () => {
      expect(controller.getHello()).toBe('OK');
    });
  });
});
EOF

# ─── src/config/config.schema.ts ─────────────────────────────────────────────
{
  echo "import * as Joi from 'joi';"
  echo ""
  echo "export const configValidationSchema = Joi.object({"
  echo "  NODE_ENV: Joi.string()"
  echo "    .valid('development', 'production', 'test')"
  echo "    .default('development'),"
  echo "  PORT: Joi.number().default(${PORT}),"
  [ "$INCLUDE_PRISMA" = "y" ] && echo "  DATABASE_URL: Joi.string().required(),"
  if [ "$INCLUDE_REDIS" = "y" ]; then
    echo "  REDIS_HOST: Joi.string().default('localhost'),"
    echo "  REDIS_PORT: Joi.number().default(6379),"
    echo "  REDIS_PASSWORD: Joi.string().allow('').default(''),"
    echo "  CACHE_TTL: Joi.number().default(300),"
  fi
  echo "  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),"
  echo "});"
} > "$D/src/config/config.schema.ts"

# ─── src/config/index.ts ─────────────────────────────────────────────────────
cat > "$D/src/config/index.ts" << 'EOF'
export { configValidationSchema } from './config.schema';
EOF

# ─── src/common/filters/all-exceptions.filter.ts ─────────────────────────────
cat > "$D/src/common/filters/all-exceptions.filter.ts" << 'EOF'
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const path = httpAdapter.getRequestUrl(ctx.getRequest());

    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Exception at ${path}: ${(exception as Error).message}`,
        (exception as Error).stack,
      );
    } else {
      this.logger.warn(
        `Operational exception at ${path}: ${JSON.stringify(message)}`,
      );
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path,
      message,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
EOF

# ─── src/common/index.ts ─────────────────────────────────────────────────────
cat > "$D/src/common/index.ts" << 'EOF'
export { AllExceptionsFilter } from './filters/all-exceptions.filter';
EOF

# ─── test/app.e2e-spec.ts ────────────────────────────────────────────────────
cat > "$D/test/app.e2e-spec.ts" << 'EOF'
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('OK');
  });
});
EOF

# ══════════════════════════════════════════════════════════════════════════════
# CONDITIONAL: PRISMA
# ══════════════════════════════════════════════════════════════════════════════
if [ "$INCLUDE_PRISMA" = "y" ]; then

# ─── prisma/schema.prisma ────────────────────────────────────────────────────
cat > "$D/prisma/schema.prisma" << SCHEMAEOF
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/@prisma/${SERVICE_NAME}-client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add your models here
SCHEMAEOF

# ─── src/prisma/prisma.module.ts ─────────────────────────────────────────────
cat > "$D/src/prisma/prisma.module.ts" << 'EOF'
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
EOF

# ─── src/prisma/prisma.service.ts ────────────────────────────────────────────
cat > "$D/src/prisma/prisma.service.ts" << SVCEOF
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/${SERVICE_NAME}-client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database...');
    await this.\$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    await this.\$disconnect();
  }
}
SVCEOF

# ─── src/prisma/prisma.service.spec.ts ───────────────────────────────────────
cat > "$D/src/prisma/prisma.service.spec.ts" << 'EOF'
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
EOF

# ─── src/prisma/index.ts ─────────────────────────────────────────────────────
cat > "$D/src/prisma/index.ts" << 'EOF'
export { PrismaModule } from './prisma.module';
export { PrismaService } from './prisma.service';
EOF

fi # end PRISMA

# ══════════════════════════════════════════════════════════════════════════════
# CONDITIONAL: REDIS
# ══════════════════════════════════════════════════════════════════════════════
if [ "$INCLUDE_REDIS" = "y" ]; then

# ─── src/cache/cache.constants.ts ────────────────────────────────────────────
cat > "$D/src/cache/cache.constants.ts" << 'EOF'
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
EOF

# ─── src/cache/cache.module.ts ───────────────────────────────────────────────
cat > "$D/src/cache/cache.module.ts" << 'EOF'
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './cache.constants';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        return new Redis({
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 3,
        });
      },
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
EOF

# ─── src/cache/cache.service.ts ──────────────────────────────────────────────
cat > "$D/src/cache/cache.service.ts" << 'EOF'
import { Inject, Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './cache.constants';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.scanByPattern(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async scanByPattern(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, foundKeys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');
    return keys;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Redis connection...');
    await this.client.quit();
  }
}
EOF

# ─── src/cache/cache.service.spec.ts ─────────────────────────────────────────
cat > "$D/src/cache/cache.service.spec.ts" << 'EOF'
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './cache.constants';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      scan: jest.fn().mockResolvedValue(['0', []]),
      quit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return parsed value', async () => {
      mockRedis.get.mockResolvedValue('{"foo":"bar"}');
      const result = await service.get('key');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null for missing key', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.get('missing');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store JSON value with TTL', async () => {
      await service.set('key', { foo: 'bar' }, 300);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'key',
        300,
        '{"foo":"bar"}',
      );
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      await service.del('key');
      expect(mockRedis.del).toHaveBeenCalledWith('key');
    });
  });
});
EOF

# ─── src/cache/index.ts ──────────────────────────────────────────────────────
cat > "$D/src/cache/index.ts" << 'EOF'
export { CacheModule } from './cache.module';
export { CacheService } from './cache.service';
EOF

fi # end REDIS

# ══════════════════════════════════════════════════════════════════════════════
# UPDATE init-db.sh (if Prisma)
# ══════════════════════════════════════════════════════════════════════════════
if [ "$INCLUDE_PRISMA" = "y" ]; then
  INIT_DB="$ROOT_DIR/scripts/init-db.sh"
  if [ -f "$INIT_DB" ]; then
    # Check if this service is already in init-db.sh
    if ! grep -qF "-- ${SERVICE_NAME}" "$INIT_DB"; then
      # Insert new block before EOSQL
      sed -i'' -e "/^EOSQL/i\\
\\
    -- ${SERVICE_NAME}\\
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';\\
    CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\\
    GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" "$INIT_DB"
      echo -e "  ${GREEN}Updated scripts/init-db.sh with ${DB_NAME}${NC}"
    fi
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "  ${GREEN}${BOLD}Service '${SERVICE_NAME}' created at apps/api/${SERVICE_NAME}/${NC}"
echo ""
echo -e "  ${BOLD}Next steps:${NC}"
echo "  1. pnpm install"
if [ "$INCLUDE_PRISMA" = "y" ]; then
  echo "  2. cd apps/api/${SERVICE_NAME} && pnpm prisma:generate"
  echo "  3. pnpm prisma:push"
fi
echo ""
echo -e "  ${BOLD}Endpoints:${NC}"
echo "  API:          http://localhost:${PORT}"
echo "  Swagger:      http://localhost:${PORT}/api/docs"
echo "  OpenAPI JSON: http://localhost:${PORT}/api/docs-json"
if [ "$INCLUDE_PRISMA" = "y" ]; then
  echo ""
  echo -e "  ${YELLOW}Note: Recreate Docker volumes for new database:${NC}"
  echo -e "  ${YELLOW}  pnpm infra:down && docker volume rm nex-shop_pgdata && pnpm infra:up${NC}"
fi
echo ""
