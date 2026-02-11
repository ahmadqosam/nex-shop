const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCALSTACK_URL = 'http://localhost:4566';
const API_GW_ID = 'nex-gw';
const AUTH_HEADER = 'AWS4-HMAC-SHA256 Credential=test/00000000/us-east-1/apigateway/aws4_request';

async function getApiGatewayRootResourceId() {
  try {
    const res = await fetch(`${LOCALSTACK_URL}/restapis/${API_GW_ID}`, {
      headers: { Authorization: AUTH_HEADER },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch API Gateway: ${res.status}`);
    }
    const data = await res.json();
    return data.rootResourceId;
  } catch (err) {
    console.error(`Error connecting to LocalStack at ${LOCALSTACK_URL}. Is it running?`);
    process.exit(1);
  }
}

async function main() {
  console.log('Resolving API Gateway root resource ID...');
  const rootResourceId = await getApiGatewayRootResourceId();
  console.log(`Root resource ID: ${rootResourceId}`);

  process.env.API_GW_ROOT_RESOURCE_ID = rootResourceId;
  process.env.AWS_ACCESS_KEY_ID = 'test';
  process.env.AWS_SECRET_ACCESS_KEY = 'test';
  process.env.AWS_REGION = 'us-east-1';

  console.log('Deploying all services via Turbo...');
  try {
    execSync('turbo deploy:local --filter="./apps/api/*"', { stdio: 'inherit' });
  } catch (err) {
    console.error('Turbo deployment failed.');
    process.exit(1);
  }

  console.log('Finalizing API Gateway stage deployment...');
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
    console.error(`Failed to create stage deployment: ${deployRes.status}`);
    process.exit(1);
  }

  console.log('\nAll services deployed successfully!');
  console.log(`Gateway: ${LOCALSTACK_URL}/restapis/${API_GW_ID}/local/_user_request_/api/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
