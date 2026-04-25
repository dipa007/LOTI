import { generateOTP } from '../utils/generateOTP.js';
import { getIO } from '../services/socketService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { otpQueue } from '../services/queueService.js';
import redis from '../services/redisService.js';

export const sendOtp = asyncHandler(async (req, res) => {
  const { phone, message, config = {} } = req.body;

  if (!phone || !message) {
    throw new ApiError(400, 'Phone number and message are required');
  }

  
  const TTL_SECONDS = config.ttl || 300; 
  const MAX_RETRIES = config.retries || 3;
  const RATE_LIMIT_MAX = parseInt(process.env.GLOBAL_RATE_LIMIT) || 3; 
  const BULLMQ_BACKOFF = parseInt(process.env.RETRY_BACKOFF_INMS) || 5000;

  const rateLimitKey = `rate_limit:${phone}`;
  const requestCount = await redis.incr(rateLimitKey);

  if (requestCount === 1) {
    await redis.expire(rateLimitKey, TTL_SECONDS);
  }

  if (requestCount > RATE_LIMIT_MAX) {
    const ttlSeconds = await redis.ttl(rateLimitKey);
    const minutesLeft = Math.ceil(ttlSeconds / 60);
    throw new ApiError(429, `Security Limit: Too many requests. Try again in ${minutesLeft} minute(s).`);
  }
  // ------------------------------------
  
  // 1. Generate the OTP
  const otp = generateOTP();

  // 2. Store OTP in Redis with a strict 5-minute (300 seconds) expiration TTL
  await redis.set(`otp:${phone}`, otp, 'EX', TTL_SECONDS);

  let finalMessage = `${otp}`;
  if (message && message.includes('{{OTP}}')) {
    finalMessage = message.replace('{{OTP}}', otp);
  } else if (message) {
     finalMessage = `${message} ${otp}`; 
  }

  // 3. Push the job to the BullMQ queue
  const job = await otpQueue.add('send-sms-job', {
    phone,
    message: finalMessage,
    ttl: TTL_SECONDS
  }, {
    attempts: MAX_RETRIES,
    backoff: { type: 'fixed', delay: BULLMQ_BACKOFF },
    removeOnComplete: { count: 1000 }, 
    removeOnFail: { count: 1000 }
  });

  console.log(`[Backend] Job ${job.id}: OTP ${otp} generated for ${phone} and queued.`);
  getIO().emit('dashboard_event', {
    type: 'job_queued',
    title: 'OTP Job Queued',
    message: `New OTP delivery request added to BullMQ queue.`,
    meta: `Phone: ${phone}`,
    timestamp: new Date().toISOString()
  });

  return res.status(200).json(
    new ApiResponse(200, { jobId: job.id }, 'OTP sent request initiated')
  );
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ApiError(400, 'Phone and OTP are required');
  }

  // 1. Fetch the OTP directly from Redis
  const storedOtp = await redis.get(`otp:${phone}`);

  // 2. Redis automatically handles the 5-minute expiration. 
  if (!storedOtp) {
    throw new ApiError(404, 'OTP expired or not found');
  }

  // 3. Verify the OTP
  if (storedOtp === otp) {
    // Delete the OTP immediately after successful verification to prevent replay attacks
    await redis.del(`otp:${phone}`);
    
    return res.status(200).json(
      new ApiResponse(200, { verified: true }, 'OTP verified successfully')
    );
  } else {
    throw new ApiError(400, 'Invalid OTP');
  }
});