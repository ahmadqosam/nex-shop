# Deploying NestJS Services to LocalStack

Guide for deploying NestJS Lambda functions in the nex-shop pnpm monorepo to LocalStack.

## The Problem

pnpm uses symlinks in `node_modules` that point to the workspace root's `.pnpm` store. When Serverless Framework zips `node_modules/**` for Lambda deployment, these symlinks break inside the Lambda container — causing "Cannot find module" errors for packages like `express`, `uid`, `load-esm`, etc.

## Solution Overview

1. **Webpack bundling** — Bundle all JS dependencies into a single file, eliminating `node_modules` from the package
2. **Native module handling** — Copy native modules (e.g., `argon2`) separately with symlinks resolved
3. **Docker networking** — Configure `LAMBDA_DOCKER_NETWORK` so Lambda containers can reach other compose services
4. **Deploy script** — Automate API Gateway discovery, env var setup, and stage deployment creation

## Step-by-Step Setup

### 1. Create `webpack.config.js`

```js
module.exports = function (options) {
  return {
    ...options,
    entry: { lambda: "./src/lambda.ts" },
    output: {
      ...options.output,
      filename: "lambda.js",
      libraryTarget: "commonjs2", // Required — Lambda needs module.exports
    },
    externals: [
      // Native modules with .node bindings cannot be bundled by webpack.
      // Use 'commonjs <name>' so webpack emits require() instead of a global ref.
      { "@prisma/client": "commonjs @prisma/client" }, // If using standard Prisma
      { "@prisma/inventory-client": "commonjs @prisma/inventory-client" }, // If using custom output

      // Externalize optional NestJS packages not installed in this project
      function ({ request }, callback) {
        const optionalDeps = [
          "@nestjs/microservices",
          "@nestjs/websockets",
          "@nestjs/platform-socket.io",
          "cache-manager",
          "class-transformer/storage",
        ];
        if (
          optionalDeps.some(
            (dep) => request === dep || request.startsWith(dep + "/"),
          )
        ) {
          try {
            require.resolve(request);
            return callback();
          } catch {
            return callback(null, "commonjs " + request);
          }
        }
        callback();
      },
    ],
  };
};
```

**Key details:**

- `libraryTarget: 'commonjs2'` is required — without it, webpack won't assign to `module.exports` and Lambda can't find the handler
- Native modules (like `argon2`) must use `{ name: 'commonjs name' }` syntax — a bare string `'argon2'` in externals generates a global variable reference instead of `require()`
- The optional deps function handles NestJS packages that are dynamically imported but not installed

### 2. Create `scripts/build-lambda.js`

```js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 1. Bundle with webpack
console.log("Building webpack bundle...");
execSync("nest build --webpack", { stdio: "inherit" });

// 2. Copy native modules with transitive deps (if any)
// Skip this section if the service has no native dependencies.
//
// In pnpm, a package's deps are co-located as siblings in the .pnpm store.
// We resolve the real path, go up one level, and copy everything — this
// gets the native module AND all its transitive dependencies.
console.log("Copying native dependencies (Prisma)...");
const prismaClientPath = "@prisma/inventory-client"; // Change to your client
const realPath = fs.realpathSync(
  path.dirname(require.resolve(prismaClientPath + "/package.json")),
);
const pnpmNodeModules = path.dirname(realPath);
const dest = path.join("dist", "node_modules");
fs.mkdirSync(dest, { recursive: true });

// Copy the client and all its sibling engine binaries
for (const entry of fs.readdirSync(pnpmNodeModules)) {
  fs.cpSync(path.join(pnpmNodeModules, entry), path.join(dest, entry), {
    recursive: true,
    dereference: true,
  });
}
console.log(`Copied ${prismaClientPath} to dist/node_modules`);

console.log("Lambda build complete.");
```

**If the service has NO native modules** (e.g., payment-api), simplify to:

```js
const { execSync } = require("child_process");
console.log("Building webpack bundle...");
execSync("nest build --webpack", { stdio: "inherit" });
console.log("Lambda build complete.");
```

### 3. Create `scripts/deploy-local.js`

```js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const LOCALSTACK_URL = "http://localhost:4566";
const API_GW_ID = "nex-gw";

// LocalStack needs the apigateway service name in the SigV4 credential scope
// to route requests to API Gateway instead of S3
const AUTH_HEADER =
  "AWS4-HMAC-SHA256 Credential=test/00000000/us-east-1/apigateway/aws4_request";

async function getApiGatewayRootResourceId() {
  const res = await fetch(`${LOCALSTACK_URL}/restapis/${API_GW_ID}`, {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch API Gateway: ${res.status}`);
  }
  const data = await res.json();
  return data.rootResourceId;
}

async function main() {
  console.log("Resolving API Gateway root resource ID...");
  const rootResourceId = await getApiGatewayRootResourceId();
  console.log(`Root resource ID: ${rootResourceId}`);

  // Build the env for serverless deploy.
  // IMPORTANT: Explicitly set any vars that differ between local dev and Lambda.
  // Serverless Framework v4 auto-loads .env files — setting vars explicitly here
  // prevents .env values (e.g., DB_HOST=localhost) from leaking into Lambda config.
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: "test",
    AWS_SECRET_ACCESS_KEY: "test",
    API_GW_ROOT_RESOURCE_ID: rootResourceId,
    // Override host values for Docker networking:
    // DB_HOST: 'postgres',
    // REDIS_HOST: 'redis',
  };

  // Clean stale Serverless state — LocalStack is ephemeral so cached
  // CloudFormation refs go stale on every restart
  const serverlessDir = path.join(__dirname, "..", ".serverless");
  fs.rmSync(serverlessDir, { recursive: true, force: true });
  console.log("Cleaned .serverless cache.");

  console.log("Building Lambda bundle...");
  execSync("pnpm build:lambda", { stdio: "inherit", env });

  console.log("Deploying to LocalStack...");
  execSync("serverless deploy --stage local", { stdio: "inherit", env });

  // LocalStack doesn't always create the API Gateway stage deployment via
  // CloudFormation — explicitly create it so the endpoint is reachable
  console.log("Creating API Gateway stage deployment...");
  const deployRes = await fetch(
    `${LOCALSTACK_URL}/restapis/${API_GW_ID}/deployments`,
    {
      method: "POST",
      headers: {
        Authorization: AUTH_HEADER,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stageName: "local" }),
    },
  );
  if (!deployRes.ok) {
    throw new Error(`Failed to create stage deployment: ${deployRes.status}`);
  }

  console.log(
    `Deployed: ${LOCALSTACK_URL}/restapis/${API_GW_ID}/local/_user_request_/`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
```

### 4. Update `package.json` scripts

```json
{
  "scripts": {
    "build:lambda": "node scripts/build-lambda.js",
    "deploy:local": "node scripts/deploy-local.js"
  }
}
```

### 5. Update `serverless.yml`

```yaml
provider:
  apiGateway:
    restApiId: nex-gw
    restApiRootResourceId: ${env:API_GW_ROOT_RESOURCE_ID}
  environment:
    # Use Docker service names as defaults (not localhost/host.docker.internal)
    DB_HOST: ${env:DB_HOST, 'postgres'}
    REDIS_HOST: ${env:REDIS_HOST, 'redis'}

package:
  individually: true
  patterns:
    - "!**"
    - "dist/**"
```

**Key changes from the original:**

- `apiGateway` section attaches to the shared `nex-gw` gateway (stable URL)
- `restApiRootResourceId` is resolved dynamically at deploy time
- Package patterns exclude everything then include only `dist/` (no `node_modules`)
- Default hosts use Docker service names, not `localhost`

### 6. Docker Compose (`docker-compose.yml`)

Add `LAMBDA_DOCKER_NETWORK` to the LocalStack service so Lambda containers join the same network as postgres, redis, etc.:

```yaml
localstack:
  environment:
    - LAMBDA_DOCKER_NETWORK=nex-shop_default
```

## Gotchas & Troubleshooting

| Issue                                  | Cause                                                 | Fix                                                            |
| -------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `Cannot find module 'express'`         | pnpm symlinks break in Lambda zip                     | Use webpack bundling (this guide)                              |
| `argon2 is not defined`                | Bare string in webpack externals generates global ref | Use `{ argon2: 'commonjs argon2' }` syntax                     |
| `Cannot find module '@phc/format'`     | Native module's transitive deps not copied            | Use pnpm store sibling copy (build-lambda.js)                  |
| `handler is undefined or not exported` | Webpack not setting `module.exports`                  | Add `libraryTarget: 'commonjs2'` to output                     |
| `API id does not correspond`           | Stale `.serverless` cache after LocalStack restart    | Deploy script auto-cleans `.serverless/`                       |
| `ECONNREFUSED 127.0.0.1:5432`          | Lambda container can't reach DB                       | Set `LAMBDA_DOCKER_NETWORK` + use service names                |
| `.env` overrides Docker hostnames      | Serverless v4 auto-loads `.env` files                 | Explicitly set env vars in deploy script                       |
| LocalStack returns XML instead of JSON | Raw fetch hits S3 by default                          | Include `apigateway` in Authorization header credential scope  |
| Endpoint returns 502 after deploy      | API Gateway stage not created                         | Deploy script creates stage deployment explicitly              |
| `app.router` is undefined              | Nest/Express 4 webpack bundling bug                   | Upgrade to `express@5`                                         |
| `ECONNREFUSED` inside Lambda           | Using `localhost` for AWS services (SQS/SNS)          | Set `AWS_ENDPOINT: http://localstack:4566` in `serverless.yml` |

## Key Learnings & Improvements (Post-Implementation)

During the implementation of these steps in `cart-api`, several critical insights were discovered:

### 1. Prisma Binary Targets

Lambda runtimes (Amazon Linux) require specific Prisma engine binaries. If you are developing on macOS, you must explicitly add the target to your `schema.prisma`:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

After updating this, run `pnpm prisma generate` before `pnpm build:lambda`.

### 2. Path Conflicts in Shared Gateway

When multiple services share the same `restApiId` (e.g., `nex-gw`), they cannot both own the root path `/`. To resolve this:

- **NestJS**: Avoid double-prefixing. If the gateway path is `api/cart`, and you want your controller at `/api/cart/items`, set the controller as `@Controller('items')` and **Omit `app.setGlobalPrefix('api')`**.
- **Serverless**: Match your gateway paths exactly:
  ```yaml
  events:
    - http:
        path: api/cart
    - http:
        path: api/cart/{proxy+}
  ```

### 3. LocalStack API Response Variances

When calling LocalStack APIs directly (via `curl` or `fetch` in scripts), be aware that some versions return `item` instead of `items` for lists. Your scripts should handle both:

```javascript
const items = response.items || response.item || [];
```

### 4. Stuck CloudFormation Stacks

If a deployment fails and the stack gets stuck in `REVIEW_IN_PROGRESS`, `serverless remove` might fail. You can force-delete the stack using:

```bash
curl -s -X POST -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Action=DeleteStack&StackName=<service>-<stage>" \
  http://localhost:4566
```

### 6. Multiple Handlers with Webpack

When a service has multiple entry points (e.g., an HTTP handler and an SQS handler), update `webpack.config.js` to define both:

```javascript
entry: {
  lambda: './src/lambda.ts',
  'lambda-sqs': './src/lambda-sqs.ts'
},
output: {
  ...options.output,
  filename: '[name].js', // Generates lambda.js and lambda-sqs.js
  libraryTarget: 'commonjs2',
},
```

### 7. Explicit Dependency on `express`

Webpack bundling requires that all core framework dependencies be explicitly listed in the package's `dependencies`, even if they are transitive dependencies of NestJS. Always run:

```bash
pnpm add express
```

Failure to do this often results in `Cannot find module 'express'` during the webpack build.

### 8. Swagger Server Configuration for Shared Gateway

To ensure the "Try it out" feature works in Swagger UI when deployed to a shared gateway stage, explicitly add the server URL in your `lambda.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle("My API")
  .addServer("/local/_user_request_/api/my-service", "LocalStack")
  .build();
```
