import http from 'http';
import app from './app.js';
import { initSocket } from './services/socketService.js';
import redis from './services/redisService.js';

const server = http.createServer(app);

initSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`LOTI Backend Infra running on http://localhost:${PORT}`);
  console.log(`Make sure that mobile app connects to the local IP address.`);
});