import { Redis } from 'ioredis';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
// Connect to the local Docker Redis instance
const redis = new Redis({
  host: redisHost,
  port: 6379,
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log('[SUCCESS] `[Redis] Connected to ${redisHost}:6379 🟢`');
});

redis.on('error', (err) => {
  console.error('[FAILURE] Redis Connection Error:', err);
});

export default redis;