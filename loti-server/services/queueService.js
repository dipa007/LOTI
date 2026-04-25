import { Queue, Worker , UnrecoverableError } from 'bullmq';
import redis from './redisService.js';
import { getIO, pendingAcks } from './socketService.js';
import { systemEvents } from '../utils/eventBus.js';

export const otpQueue = new Queue('otp-sms-queue', { 
  connection: redis,
  defaultJobOptions: {
    attempts: 3, 
    backoff: { type: 'fixed', delay: 5000 },
    // removeOnComplete: true
    removeOnComplete: { count: 1000 }, 
    removeOnFail: { count: 1000 }
  }
});

const worker = new Worker('otp-sms-queue', async (job) => {
  console.log(`\n[Queue] ⏳ Processing Job ${job.id} for ${job.data.phone}`);
  
  // --- DYNAMIC TTL CHECK ---
  const jobAgeInMilliseconds = Date.now() - job.timestamp;
  
  // Pull the dynamic TTL from the job data, fallback to 5 mins if undefined
  const ttlMilliseconds = (job.data.ttl || 300) * 1000; 

  if (jobAgeInMilliseconds > ttlMilliseconds) {
    console.log(`[Queue] 🗑️ Job ${job.id} is older than its TTL. Discarding useless OTP.`);
    throw new UnrecoverableError('OTP expired in queue before delivery'); 
  }
  // ---------------------------------------

  const io = getIO();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingAcks.delete(String(job.id));
      reject(new Error('Mobile phone did not acknowledge in time (Timeout)'));
    }, 30000);

    pendingAcks.set(String(job.id), { resolve, reject, timeout });

    io.emit('send_sms', {
      jobId: job.id, 
      phone: job.data.phone,
      message: job.data.message
    });
  });
}, { 
  connection: redis
});

// --- CONVEYOR BELT STATE MANAGEMENT --- (DONT TOUCH IT)

let isQueuePaused = false;

// 🛡️ PROTECTED: Boot sequence 
const initBootSequence = async () => {
  try {
    console.log('🧹 Developer Mode: Resetting rate limits and queue...');
    
    const rateLimitKeys = await redis.keys('rate_limit:*');
    if (rateLimitKeys.length > 0) {
      await redis.del(rateLimitKeys); // Deletes all active lockouts instantly
    }
    // -----------------------------------------------------------------------------

    // Obliterate the queue to reset Job IDs to 1
    //await otpQueue.obliterate({ force: true });

    await worker.pause();
    isQueuePaused = true;
    console.log('⏸️ Queue Paused on boot: Waiting for mobile device...');
  } catch (error) {
    console.error('[Queue Error] Could not initialize boot sequence:', error.message);
  }
};
initBootSequence();

systemEvents.on('worker_connected', async () => {
  try {
    if (isQueuePaused) {
      await worker.resume();
      isQueuePaused = false;
      console.log('▶️ Queue Resumed: Mobile device online. Processing FIFO...');
    }
  } catch (error) {
    console.error('[Queue Error] Failed to resume worker:', error.message);
  }
});

systemEvents.on('worker_disconnected', async () => {
  try {
    if (!isQueuePaused) {
      await worker.pause();
      isQueuePaused = true;
      console.log('⏸️ Queue Paused: No devices online. Holding jobs in perfect order...');
    }
  } catch (error) {
    console.error('[Queue Error] Failed to pause worker:', error.message);
  }
});



// 1. Listen for Successful Deliveries (Phone Acknowledged)
worker.on('completed', (job) => {
  console.log(`[Queue] ✅ Job ${job.id} completed successfully`);
  
  getIO().emit('dashboard_event', {
    type: 'sms_sent',
    title: 'SMS Delivered',
    message: `Phone successfully acknowledged delivery.`,
    meta: `Job ID: #${job.id} | Phone: ${job.data.phone}`,
    timestamp: new Date().toISOString()
  });
});

// 2. Listen for Failures AND Expiries (Phone Error or TTL Hit)
worker.on('failed', (job, err) => {
  console.log(`[Queue] ⚠️ Job ${job.id} failed: ${err.message}`);
  
  const isExpired = err.message.includes('expired');
  
  getIO().emit('dashboard_event', {
    type: 'sms_failed',
    title: isExpired ? 'OTP Expired' : 'Delivery Failed',
    message: isExpired 
      ? 'Job died in the queue before reaching a phone.' 
      : `Phone reported an error: ${err.message}`,
    meta: `Job ID: #${job.id} | Phone: ${job.data.phone}`,
    timestamp: new Date().toISOString()
  });
});
