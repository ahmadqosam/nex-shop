const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCALSTACK_URL = 'http://localhost:4566';
const API_GW_ID = 'nex-gw';

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

  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: 'test',
    AWS_SECRET_ACCESS_KEY: 'test',
    API_GW_ROOT_RESOURCE_ID: rootResourceId,
    RSA_PUBLIC_KEY:
      'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFyL2U3eXhQRitjZTROdEp4MSs5awpYY0ZOT2tORDh1SUh4a2c0dU1zcTduZWtWMlNRaUdyQUIrYThQQnk3ZFpjWVkxekRBSm53SVRRTHFxOFhTWkl2CitpSVk5UlJmUXZLMG1lVHBHR3IrWk9MV1ROVTBGcFFvT2gwdmRvcmNmSmtYSlNtRUtVN0F5czNxdDBZZFpVelcKbkRyUHR4TDB6dCszRE1FMFJqOUtlbVVRbjhadW45Vm16TEVWNlBpMjkzamRFYnV3NmVrNldVSWZHelovWDFmRwoyZkl2QTVvcFl5YnRXOUFLelJlaXllR2g2SnIramsxdUJOSjVlVW12bTQ4a0lmaTJPUjI2eGt0Y293Y3VsV3d5Ckl6aUdzc21GYWZFS1NwK3ZxeWdxN0pab2VtaUwwdmRsUVNCVHFCc29RaC9yYi85UmZ4MkJqRFBzSitodHoraloKOVFJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==',
    STRIPE_SECRET_KEY: 'sk_test_xxx',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  };

  const serverlessDir = path.join(__dirname, '..', '.serverless');
  fs.rmSync(serverlessDir, { recursive: true, force: true });
  console.log('Cleaned .serverless cache.');

  console.log('Building Lambda bundle...');
  execSync('pnpm build:lambda', { stdio: 'inherit', env });

  console.log('Deploying to LocalStack...');
  execSync('serverless deploy --stage local', { stdio: 'inherit', env });

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
    `Deployed: ${LOCALSTACK_URL}/restapis/${API_GW_ID}/local/_user_request_/api/payments/health`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
