
// Thrown when the LOTI Server is unreachable or offline.
export class LotiConnectionError extends Error {
  constructor(message = 'LOTI server is unreachable. Is the Docker container running?') {
    super(message);
    this.name = 'LotiConnectionError';
  }
}

// Thrown when a developer hits the OTP rate limit.
export class LotiRateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LotiRateLimitError';
  }
}

// Thrown when an OTP is invalid or expired during verification.
export class LotiVerificationError extends Error {
  constructor(message = 'Invalid or expired OTP.') {
    super(message);
    this.name = 'LotiVerificationError';
  }
}

// Thrown when no Android hardware is connected to process the SMS.
export class LotiDeviceUnavailableError extends Error {
  constructor(message = 'No active mobile device available to send SMS.') {
    super(message);
    this.name = 'LotiDeviceUnavailableError';
  }
}