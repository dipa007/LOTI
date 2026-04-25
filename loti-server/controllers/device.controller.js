import redis from '../services/redisService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const registerDevice = asyncHandler(async (req, res) => {
  const { deviceId, deviceName } = req.body;

  if (!deviceId) {
    throw new ApiError(400, 'deviceId is required');
  }

  // 1. Save to Redis instead of the deleted memory array
  const statePayload = JSON.stringify({
    deviceName: deviceName || 'Unknown Device',
    status: 'online',
    lastSeen: new Date().toISOString()
  });
  
  await redis.set(`worker_state:${deviceId}`, statePayload);

  console.log(`[Backend REST] Device registered to Redis: ${deviceId}`);
  
  return res.status(200).json(
    new ApiResponse(200, { deviceId }, 'Device registered successfully in Redis')
  );
});

export const reportSmsStatus = asyncHandler(async (req, res) => {
  const { phone, status } = req.body;

  if (!phone || !status) {
    throw new ApiError(400, 'Phone and status are required');
  }

  // 2. Push the log into a Redis List instead of the deleted smsLogs array
  const logEntry = JSON.stringify({ phone, status, timestamp: new Date().toISOString() });
  await redis.lpush('legacy_sms_logs', logEntry);
  
  // Cap the list at 100 entries so our Redis memory doesn't bloat over time
  await redis.ltrim('legacy_sms_logs', 0, 99);

  console.log(`[Backend REST] SMS to ${phone} reported as: ${status}`);

  return res.status(200).json(
    new ApiResponse(200, null, 'SMS status recorded in Redis')
  );
});

export const getLogs = asyncHandler(async (req, res) => {
  // 3. Instead of pulling from memory, just acknowledge the transition to Redis
  const deviceKeys = await redis.keys('worker_state:*');
  
  return res.status(200).json(
    new ApiResponse(200, { 
        activeDevicesCount: deviceKeys.length,
        notice: "Detailed logs are now managed by BullMQ and Redis directly."
    }, 'Logs retrieved successfully')
  );
});