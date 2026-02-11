const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Bundle with webpack
console.log('Building webpack bundle...');
execSync('nest build --webpack', { stdio: 'inherit' });

// 2. Copy native modules with transitive deps (Prisma)
console.log('Copying native dependencies (Prisma)...');
const prismaClientPath = '@prisma/product-client';
const realPath = fs.realpathSync(
  path.dirname(require.resolve(prismaClientPath + '/package.json')),
);
const pnpmNodeModules = path.dirname(realPath);
const dest = path.join('dist', 'node_modules');
fs.mkdirSync(dest, { recursive: true });

// Copy the client and all its sibling engine binaries
const scope = prismaClientPath.split('/')[0];
const scopeDest = path.join('dist', 'node_modules', scope);
fs.mkdirSync(scopeDest, { recursive: true });

for (const entry of fs.readdirSync(pnpmNodeModules)) {
  fs.cpSync(path.join(pnpmNodeModules, entry), path.join(scopeDest, entry), {
    recursive: true,
    dereference: true,
  });
}
console.log(`Copied ${prismaClientPath} to dist/node_modules`);

console.log('Lambda build complete.');
