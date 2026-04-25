import axios from 'axios';
import { 
  LotiConnectionError, 
  LotiRateLimitError, 
  LotiVerificationError, 
  LotiDeviceUnavailableError 
} from './errors.js';

/**
 * @typedef {Object} LotiConfig
 * @property {string} [endpoint='http://localhost:3000'] - The LOTI server endpoint.
 * @property {number} [defaultTTL=300] - Default OTP expiration in seconds.
 * @property {number} [defaultRetries=3] - Default retry attempts for SMS delivery.
 */

/**
 * @typedef {Object} SendOtpOptions
 * @property {string} phone - The recipient's phone number (e.g., '+919876543210').
 * @property {number} [ttl] - Override the default time-to-live for this specific OTP.
 * @property {number} [retries] - Override the default retry attempts.
 * @property {number} [priority] - Set BullMQ job priority (lower number = higher priority).
 */

export class LotiClient {
  constructor(config = {}) {
    this.endpoint = config.endpoint || 'http://localhost:3000';
    this.defaultTTL = config.defaultTTL || 300;
    this.defaultRetries = config.defaultRetries || 3;

    this.api = axios.create({
      baseURL: this.endpoint,
      headers: { 'Content-Type': 'application/json' },
    });

    this._validateConnection();
  }

  async _validateConnection() {
    try {
      await this.api.get('/dashboard/stats'); 
    } catch (error) {
      console.warn(`[LOTI SDK Warning]: Cannot reach server at ${this.endpoint}. Ensure your LOTI backend is running.`);
    }
  }

  _handleError(error) {
    if (!error.response) throw new LotiConnectionError(`Cannot connect to LOTI server at ${this.endpoint}`);
    const status = error.response.status;
    const message = error.response.data?.message || error.message;

    if (status === 429) throw new LotiRateLimitError(message);
    if (status === 400 || status === 404) throw new LotiVerificationError(message);
    if (status === 503) throw new LotiDeviceUnavailableError(message);

    throw new Error(`LOTI Error: ${message}`);
  }

  // ==========================================
  // CORE API METHODS
  // ==========================================

  /**
   * Generates and sends an OTP to the specified phone number via local hardware.
   * * @param {SendOtpOptions} options - The OTP configuration options.
   * @returns {Promise<{success: boolean, jobId: string|number}>} The queued job details.
   * @throws {LotiRateLimitError|LotiDeviceUnavailableError}
   */

  async sendOTP(options) {
    if (!options || !options.phone) {
        throw new Error("LOTI Error: 'phone' is required to send an OTP.");
    }

    try {
        const payload = {
            phone: options.phone,
            message: options.message || "{{OTP}}", 
            config: {
                ttl: options.ttl || this.defaultTTL,
                retries: options.retries || this.defaultRetries
            }
        };

        const response = await this.api.post('/otp/send', payload);
        return { success: true, jobId: response.data.data.jobId };
    } catch (error) {
        this._handleError(error);
    }
  }

  /**
   * Verifies an OTP against the Redis datastore.
   * * @param {Object} params
   * @param {string} params.phone - The phone number associated with the OTP.
   * @param {string} params.otp - The code provided by the user.
   * @returns {Promise<{verified: boolean}>}
   * @throws {LotiVerificationError}
   */
  async verifyOTP({ phone, otp }) {
    if (!phone || !otp) {
      throw new Error("LOTI Error: Both 'phone' and 'otp' are required for verification.");
    }

    try {
      await this.api.post('/otp/verify', { phone, otp });
      return { verified: true };
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Convenience method to resend an OTP. 
   * Internally calls sendOTP but can be expanded for specific resend logic.
   * * @param {SendOtpOptions} options 
   * @returns {Promise<{success: boolean, jobId: string|number}>}
   */
  async resendOTP(options) {
    return this.sendOTP(options);
  }

  // ==========================================
  // INFRASTRUCTURE UTILITY METHODS
  // ==========================================

  /**
   * Retrieves the current state of a specific OTP delivery job.
   * * @param {string|number} jobId - The ID returned by sendOTP().
   * @returns {Promise<{status: string, attempts: number}>}
   */
  async getJobStatus(jobId) {
    try {
      const response = await this.api.get(`/dashboard/jobs/${jobId}`);
      return response.data.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Returns a list of all currently connected Android worker nodes.
   * * @returns {Promise<Array<{deviceId: string, status: string}>>}
   */
  async getConnectedDevices() {
    try {
      const response = await this.api.get('/dashboard/devices');
      return response.data.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Checks the overall health of the LOTI infrastructure (Redis, Queue, Backend).
   * * @returns {Promise<{backend: boolean, redis: boolean, queue: boolean, connectedDevices: number}>}
   */
  async getSystemHealth() {
    try {
      const [stats, devices] = await Promise.all([
        this.api.get('/dashboard/stats'),
        this.api.get('/dashboard/devices')
      ]);

      return {
        backend: true,
        redis: true, // If stats returned, Redis is up
        queue: true, // If stats returned, BullMQ is up
        connectedDevices: devices.data.data.filter(d => d.status === 'online').length
      };
    } catch (error) {
      return { backend: false, redis: false, queue: false, connectedDevices: 0 };
    }
  }
}