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
  const getApisRes = await fetch(`${LOCALSTACK_URL}/restapis`, {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!getApisRes.ok) {
    throw new Error(`Failed to fetch API Gateways: ${getApisRes.status}`);
  }
  const apis = await getApisRes.json();
  const items = apis.items || apis.item || [];
  const api = items.find((i) => i.tags && i.tags._custom_id_ === API_GW_ID);

  if (!api) {
    throw new Error(`API Gateway with tag _custom_id_=${API_GW_ID} not found`);
  }

  // Use rootResourceId from the API object if available (LocalStack often provides it)
  if (api.rootResourceId) {
    return { apiId: api.id, rootResourceId: api.rootResourceId };
  }

  const res = await fetch(`${LOCALSTACK_URL}/restapis/${api.id}/resources`, {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch API Gateway resources: ${res.status}`);
  }
  const resources = await res.json();
  const resourceItems = resources.items || resources.item || [];
  const rootResource = resourceItems.find((r) => r.path === '/');
  return { apiId: api.id, rootResourceId: rootResource.id };
}

async function main() {
  console.log('Resolving API Gateway details...');
  const { apiId, rootResourceId } = await getApiGatewayRootResourceId();
  console.log(`API ID: ${apiId}, Root resource ID: ${rootResourceId}`);

  // Build the env for serverless deploy.
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: 'test',
    AWS_SECRET_ACCESS_KEY: 'test',
    API_GW_ID: apiId,
    API_GW_ROOT_RESOURCE_ID: rootResourceId,
  };

  // Clean stale Serverless state
  const serverlessDir = path.join(__dirname, '..', '.serverless');
  fs.rmSync(serverlessDir, { recursive: true, force: true });
  console.log('Cleaned .serverless cache.');

  console.log('Building Lambda bundle...');
  execSync('pnpm build:lambda', { stdio: 'inherit', env });

  console.log('Deploying to LocalStack...');
  execSync('serverless deploy --stage local', { stdio: 'inherit', env });

  // Create API Gateway stage deployment
  console.log('Creating API Gateway stage deployment...');
  const deployRes = await fetch(
    `${LOCALSTACK_URL}/restapis/${apiId}/deployments`,
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
    `Deployed: ${LOCALSTACK_URL}/restapis/${apiId}/local/_user_request_/`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
