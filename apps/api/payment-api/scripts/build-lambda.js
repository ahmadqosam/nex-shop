const { execSync } = require('child_process');
console.log('Building webpack bundle...');
execSync('nest build --webpack', { stdio: 'inherit' });
console.log('Lambda build complete.');
