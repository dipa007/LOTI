import { Router } from 'express';
import { 
  getDevices, 
  getStats, 
  getJobs, 
  getOtpLogs, 
  getFailures,
  nukeInfrastructure,
  getJobStatus
} from '../controllers/dashboard.controller.js';

const router = Router();

// Core Architecture APIs
router.route('/stats').get(getStats);
router.route('/devices').get(getDevices);
router.route('/jobs').get(getJobs);

// Dedicated PRD APIs
router.route('/otp-logs').get(getOtpLogs);
router.route('/failures').get(getFailures);
router.route('/nuke').post(nukeInfrastructure)
router.get('/jobs/:id', getJobStatus);
export default router;