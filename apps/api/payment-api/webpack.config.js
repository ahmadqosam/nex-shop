module.exports = function (options) {
  return {
    ...options,
    entry: {
      lambda: './src/lambda.ts'
    },
    output: {
      ...options.output,
      filename: 'lambda.js',
      libraryTarget: 'commonjs2',
    },
    externals: [
      { '@prisma/client': 'commonjs @prisma/client' },
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
