const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Bundle with webpack
console.log('Building webpack bundle...');
execSync('nest build --webpack', { stdio: 'inherit' });

// 2. Copy native modules (Prisma)
console.log('Copying native dependencies (Prisma)...');
const nativeModules = ['@prisma/inventory-client'];
for (const mod of nativeModules) {
  try {
    const pkgPath = require.resolve(mod + '/package.json');
    const realPath = fs.realpathSync(path.dirname(pkgPath));
    const dest = path.join('dist', 'node_modules');
    fs.mkdirSync(dest, { recursive: true });

    const targetDest = path.join(dest, mod);
    fs.mkdirSync(path.dirname(targetDest), { recursive: true });

    fs.cpSync(realPath, targetDest, {
      recursive: true,
      dereference: true,
    });
    
    // Also copy @prisma/client
    try {
        const prismaClientPath = require.resolve('@prisma/client/package.json');
        const prismaClientRealPath = fs.realpathSync(path.dirname(prismaClientPath));
        fs.cpSync(prismaClientRealPath, path.join(dest, '@prisma/client'), {
            recursive: true,
            dereference: true,
        });
    } catch (e) {
        console.log('@prisma/client not found or already copied');
    }

    console.log(`Copied ${mod} to dist/node_modules`);
  } catch (err) {
    console.error(`Failed to copy ${mod}:`, err.message);
  }
}

console.log('Lambda build complete.');
