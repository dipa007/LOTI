import redis from '../services/redisService.js';
import { otpQueue } from '../services/queueService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// 1. Get Device Statuses
export const getDevices = asyncHandler(async (req, res) => {
  const keys = await redis.keys('worker_state:*');
  const devices = [];

  for (const key of keys) {
    const rawData = await redis.get(key);
    if (rawData) {
      const data = JSON.parse(rawData);
      devices.push({
        deviceId: key.replace('worker_state:', ''),
        ...data
      });
    }
  }

  return res.status(200).json(
    new ApiResponse(200, devices, 'Devices retrieved successfully')
  );
});

// 2. Get High-Level System Stats
export const getStats = asyncHandler(async (req, res) => {
  // BullMQ gives us exact queue counts instantly
  const jobCounts = await otpQueue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed');
  
  // Calculate total requests by summing all job states
  const totalRequests = Object.values(jobCounts).reduce((acc, count) => acc + count, 0);

  // Count active devices
  const keys = await redis.keys('worker_state:*');
  let activeDevices = 0;
  for (const key of keys) {
    const rawData = await redis.get(key);
    if (rawData && JSON.parse(rawData).status === 'online') {
      activeDevices++;
    }
  }

  const stats = {
    totalRequests,
    queueStatus: jobCounts,
    activeDevices,
    successRate: totalRequests > 0 ? ((jobCounts.completed / totalRequests) * 100).toFixed(1) + '%' : '0%'
  };

  return res.status(200).json(
    new ApiResponse(200, stats, 'System stats retrieved successfully')
  );
});

// 3. Get Recent Queue Jobs (OTP Logs & Failures)
export const getJobs = asyncHandler(async (req, res) => {
  const jobs = await otpQueue.getJobs(['wait', 'active', 'completed', 'failed', 'delayed'], 0, 50, true);
  
  const formattedJobs = await Promise.all(jobs.map(async (job) => {
    const currentState = await job.getState();
    
    return {
      id: job.id,
      phone: job.data.phone,
      status: currentState,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts?.attempts || 3,
      failedReason: job.failedReason || null,
      timestamp: new Date(job.timestamp).toISOString(),
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
    };
  }));
  // --------------------------------------------------------------------

  return res.status(200).json(
    new ApiResponse(200, formattedJobs, 'Recent jobs retrieved successfully')
  );
});

// 4. Get Detailed OTP Logs (With Filtering & Search)
export const getOtpLogs = asyncHandler(async (req, res) => {
  const { status, phone } = req.query;
  
  // Fetch a larger batch for the data table
  let jobs = await otpQueue.getJobs(['wait', 'active', 'completed', 'failed', 'delayed'], 0, 100, true);
  
  let logs = await Promise.all(jobs.map(async (job) => {
    const jobState = await job.getState();
    
    // Check Redis to see if the OTP is still alive or expired
    const isAlive = await redis.exists(`otp:${job.data.phone}`);
    
    return {
      id: job.id,
      phone: job.data.phone,
      message: job.data.message, // The actual OTP sent
      status: jobState,          // 'completed', 'failed', 'wait', etc.
      isExpired: !isAlive,       // If it's gone from Redis, it's expired!
      timestamp: new Date(job.timestamp).toISOString(),
    };
  }));

  // Apply Frontend Filters
  if (status) {
    logs = logs.filter(log => log.status === status);
  }
  if (phone) {
    // Search by partial phone number match
    logs = logs.filter(log => log.phone.includes(phone));
  }

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return res.status(200).json(
    new ApiResponse(200, logs, 'OTP logs retrieved successfully')
  );
});

// 5. Get Dedicated Failure Logs
export const getFailures = asyncHandler(async (req, res) => {
  // Fetch ONLY the permanently failed jobs
  const failedJobs = await otpQueue.getJobs(['failed'], 0, 50, true);
  
  const failures = failedJobs.map(job => ({
    id: job.id,
    phone: job.data.phone,
    reason: job.failedReason || 'Unknown connection drop',
    attemptsMade: job.attemptsMade,
    failedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : new Date().toISOString()
  }));

  return res.status(200).json(
    new ApiResponse(200, failures, 'Failure logs retrieved successfully')
  );
});

export const nukeInfrastructure = async (req, res) => {
  try {
    // 1. Force obliterate the BullMQ engine (wipes all jobs and resets ID to 1)
    await otpQueue.obliterate({ force: true });

    // 2. Vaporize all OTPs and Rate Limits from Redis
    const otpKeys = await redis.keys('otp:*');
    const rateKeys = await redis.keys('rate_limit:*');
    const workerkeys = await redis.keys('worker_state:*');
    const allKeys = [...otpKeys, ...rateKeys,...workerkeys];
    
    if (allKeys.length > 0) {
      await redis.del(allKeys);
    }

    // 3. Broadcast this action to our Live Activity Feed
    getIO().emit('dashboard_event', {
      type: 'system_error',
      title: 'Infrastructure Obliterated',
      message: 'Developer manually triggered a total data wipe. Clean slate ready.',
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({ success: true, message: 'Infrastructure obliterated successfully' });
  } catch (error) {
    console.error("Nuke failed:", error);
    return res.status(500).json({ success: false, message: 'Failed to obliterate system' });
  }
};

// to fetch a specific job by its ID
export const getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await otpQueue.getJob(id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const state = await job.getState();
    
    return res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        phone: job.data.phone,
        status: state, // 'completed', 'failed', 'active', 'waiting'
        failedReason: job.failedReason || null
      }
    });
  } catch (error) {
    console.error("Error fetching job status:", error);
    return res.status(500).json({ success: false, message: 'Failed to fetch job status' });
  }
};