const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Bundle with webpack
console.log('Building webpack bundle...');
execSync('nest build --webpack', { stdio: 'inherit' });

// 2. Copy native modules (argon2) with all transitive deps
// Resolves pnpm symlinks by reading from the pnpm store's node_modules
// where argon2 and its deps are co-located as siblings
console.log('Copying native dependencies...');
const argon2Real = fs.realpathSync(
  path.dirname(require.resolve('argon2/package.json')),
);
const pnpmNodeModules = path.dirname(argon2Real);
const dest = path.join('dist', 'node_modules');

fs.mkdirSync(dest, { recursive: true });
for (const entry of fs.readdirSync(pnpmNodeModules)) {
  fs.cpSync(path.join(pnpmNodeModules, entry), path.join(dest, entry), {
    recursive: true,
    dereference: true,
  });
}

console.log('Lambda build complete.');
