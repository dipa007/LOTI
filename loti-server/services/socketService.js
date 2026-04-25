import { Server } from 'socket.io';
import { systemEvents } from '../utils/eventBus.js';
import redis from './redisService.js'
let io;
export const pendingAcks = new Map();

export const initSocket = (server) => {
  io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    console.log(`[Socket] Mobile worker connected: ${socket.id}`);
    systemEvents.emit('worker_connected');

    socket.on('device_register', async (data) => {
      // 1. Attach the deviceId to this specific socket session so we remember it
      socket.deviceId = data.deviceId; 
      
      // 2. Save the exact state to Redis
      const statePayload = JSON.stringify({
        status: 'online',
        socketId: socket.id,
        connectedAt: new Date().toISOString()
      });
      
      await redis.set(`worker_state:${data.deviceId}`, statePayload);
      console.log(`[Redis] Worker ${data.deviceId} state updated to ONLINE 🟢`);
      io.emit('dashboard_event', {
        type: 'device_online',
        title: 'Worker Node Connected',
        message: `Android hardware registered successfully.`,
        meta: `Device ID: ${data.deviceId}`,
        timestamp: new Date().toISOString()
      });
    });
    // ------------------------------------------------------

    socket.on('sms_sent_ack', (data) => {
      const jobResolver = pendingAcks.get(String(data.jobId));
      
      if (jobResolver) {
        clearTimeout(jobResolver.timeout);
        if (data.status === 'delivered') {
          console.log(`[Queue] ✅ Job ${data.jobId} completed successfully.`);
          jobResolver.resolve('SMS successfully delivered');
        } else {
          console.log(`[Queue] ❌ Job ${data.jobId} failed at device level.`);
          jobResolver.reject(new Error('Mobile phone reported SMS failure'));
        }
        pendingAcks.delete(String(data.jobId));
      }
    });

    socket.on('disconnect', async () => {
      try {
        console.log(`[Socket] Mobile worker disconnected: ${socket.id}`);

        if (socket.deviceId) {
          const currentState = await redis.get(`worker_state:${socket.deviceId}`);
          if (currentState) {
            const state = JSON.parse(currentState);
            state.status = 'offline';
            state.disconnectedAt = new Date().toISOString();
            
            await redis.set(`worker_state:${socket.deviceId}`, JSON.stringify(state));
            console.log(`[Redis] Worker ${socket.deviceId} state updated to OFFLINE 🔴`);
            io.emit('dashboard_event', {
              type: 'device_offline',
              title: 'Worker Node Disconnected',
              message: 'Connection to Android hardware lost.',
              meta: `Device ID: ${socket.deviceId || 'Unknown'}`,
              timestamp: new Date().toISOString()
            });
          }
        }
        // ------------------------------------------------------

        const sockets = await io.fetchSockets();
        if (sockets.length === 0) {
          systemEvents.emit('worker_disconnected');
        }
      } catch (error) {
        console.error('[Socket Error]', error.message);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io is not initialized!');
  return io;
};