import Redis from 'ioredis';

async function flush() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  console.log('Flushing Redis...');
  await redis.flushall();
  console.log('Redis flushed.');
  await redis.quit();
}

flush().catch(console.error);
