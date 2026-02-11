module.exports = function (options) {
  return {
    ...options,
    entry: { lambda: './src/lambda.ts' },
    output: {
      ...options.output,
      filename: 'lambda.js',
      libraryTarget: 'commonjs2', // Required — Lambda needs module.exports
    },
    externals: [
      // Native modules with .node bindings cannot be bundled by webpack.
      // Use 'commonjs <name>' so webpack emits require() instead of a global ref.
      { '@prisma/cart-api-client': 'commonjs @prisma/cart-api-client' },

      // Externalize optional NestJS packages not installed in this project
      function ({ request }, callback) {
        const optionalDeps = [
          '@nestjs/microservices',
          '@nestjs/websockets',
          '@nestjs/platform-socket.io',
          'cache-manager',
          'class-transformer/storage',
        ];
        if (
          optionalDeps.some(
            (dep) => request === dep || request.startsWith(dep + '/'),
          )
        ) {
          try {
            require.resolve(request);
            return callback();
          } catch {
            return callback(null, 'commonjs ' + request);
          }
        }
        callback();
      },
    ],
  };
};
