// index.d.ts

export interface LotiConfig {
  /** The URL of the LOTI backend infrastructure (default: http://localhost:3000) */
  endpoint?: string;
  /** Default OTP expiration time in seconds (default: 300) */
  defaultTTL?: number;
  /** Default number of retries if the Android worker fails (default: 3) */
  defaultRetries?: number;
}

export interface SendOtpOptions {
  /** The recipient's phone number with country code (e.g., '+919876543210') */
  phone: string;
  /** Optional custom message payload. Use {{OTP}} where the code should be injected. */
  message?: string;
  /** Override the default time-to-live for this specific OTP */
  ttl?: number;
  /** Override the default retry attempts for this specific job */
  retries?: number;
}

export interface VerifyOtpOptions {
  /** The recipient's phone number */
  phone: string;
  /** The 6-digit code provided by the user */
  otp: string;
}

export class LotiClient {
  constructor(config?: LotiConfig);

  /**
   * Generates and sends an OTP to the specified phone number via local hardware.
   */
  sendOTP(options: SendOtpOptions): Promise<{ success: boolean; jobId: string | number }>;

  /**
   * Verifies an OTP against the Redis datastore.
   */
  verifyOTP(options: VerifyOtpOptions): Promise<{ verified: boolean }>;

  /**
   * Retrieves the current state of a specific OTP delivery job.
   */
  getJobStatus(jobId: string | number): Promise<{ status: string; attempts: number }>;

  /**
   * Checks the overall health of the LOTI infrastructure.
   */
  getSystemHealth(): Promise<{
    backend: boolean;
    redis: boolean;
    queue: boolean;
    connectedDevices: number;
  }>;
}