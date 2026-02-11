const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCALSTACK_URL = 'http://localhost:4566';
const API_GW_ID = 'nex-gw';

// LocalStack needs the apigateway service name in the SigV4 credential scope
// to route requests to API Gateway instead of S3
const AUTH_HEADER =
  'AWS4-HMAC-SHA256 Credential=test/00000000/us-east-1/apigateway/aws4_request';

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
  console.log('Resolving API Gateway root resource ID...');
  const rootResourceId = await getApiGatewayRootResourceId();
  console.log(`Root resource ID: ${rootResourceId}`);

  // Read RSA keys from files and base64-encode for Lambda env vars
  // CryptoService.loadKeys() decodes these back to PEM at runtime
  const keysDir = path.join(__dirname, '..', 'keys');
  const rsaPrivateKey = fs.readFileSync(path.join(keysDir, 'private.pem'));
  const rsaPublicKey = fs.readFileSync(path.join(keysDir, 'public.pem'));

  // Explicitly set Docker service names for Lambda networking —
  // Lambda runs inside Docker, so it needs container hostnames, not localhost.
  // These must be set (not stripped) because Serverless Framework auto-loads
  // .env files and would re-add DB_HOST=localhost if the var is absent.
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: 'test',
    AWS_SECRET_ACCESS_KEY: 'test',
    API_GW_ROOT_RESOURCE_ID: rootResourceId,
    RSA_PRIVATE_KEY: rsaPrivateKey.toString('base64'),
    RSA_PUBLIC_KEY: rsaPublicKey.toString('base64'),
    DB_HOST: 'postgres',
    REDIS_HOST: 'redis',
  };

  // Clean stale Serverless state — LocalStack is ephemeral so cached
  // CloudFormation refs go stale on every restart
  const serverlessDir = path.join(__dirname, '..', '.serverless');
  fs.rmSync(serverlessDir, { recursive: true, force: true });
  console.log('Cleaned .serverless cache.');

  console.log('Building Lambda bundle...');
  execSync('pnpm build:lambda', { stdio: 'inherit', env });

  console.log('Deploying to LocalStack...');
  execSync('serverless deploy --stage local', { stdio: 'inherit', env });

  // LocalStack doesn't always create the API Gateway stage deployment via
  // CloudFormation — explicitly create it so the endpoint is reachable
  console.log('Creating API Gateway stage deployment...');
  const deployRes = await fetch(
    `${LOCALSTACK_URL}/restapis/${API_GW_ID}/deployments`,
    {
      method: 'POST',
      headers: {
        Authorization: AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stageName: 'local' }),
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
