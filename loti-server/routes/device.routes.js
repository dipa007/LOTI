import express from 'express';
import { registerDevice, reportSmsStatus, getLogs } from '../controllers/device.controller.js';

const router = express.Router();

router.post('/register', registerDevice);
router.post('/status', reportSmsStatus);
router.get('/logs', getLogs);

export default router;