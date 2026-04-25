import axios from 'axios';

// Point this to your Node backend
const API_BASE_URL = '/dashboard';

export const dashboardApi = {
  getStats: async () => {
    const response = await axios.get(`${API_BASE_URL}/stats`);
    return response.data.data;
  },
  getDevices: async () => {
    const response = await axios.get(`${API_BASE_URL}/devices`);
    return response.data.data;
  },
  getJobs: async () => {
    const response = await axios.get(`${API_BASE_URL}/jobs`);
    return response.data.data;
  },
  getOtpLogs: async (params = {}) => {
    const response = await axios.get(`${API_BASE_URL}/otp-logs`, { params });
    return response.data.data;
  },
  getFailures: async () => {
    const response = await axios.get(`${API_BASE_URL}/failures`);
    return response.data.data;
  },
  nukeSystem: async () => {
    const response = await axios.post(`${API_BASE_URL}/nuke`);
    return response.data;
  }
};
