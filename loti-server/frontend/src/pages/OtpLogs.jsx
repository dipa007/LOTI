import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { dashboardApi } from '../services/api';

const StatusBadge = ({ status, isExpired }) => {
  // 1. Permanent States Override Everything
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 w-fit text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full border border-green-200">
        <CheckCircle2 size={14} /> Delivered
      </span>
    );
  }
  
  if (status === 'failed') {
    return (
      <span className="flex items-center gap-1 w-fit text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
        <XCircle size={14} /> Failed
      </span>
    );
  }

  // 2. If it's still in the queue, BUT the OTP is gone from Redis, it's a Ghost
  if (isExpired) {
    return (
      <span className="flex items-center gap-1 w-fit text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
        <AlertCircle size={14} /> Expired
      </span>
    );
  }
  
  // 3. Otherwise, it is healthy and waiting for a device
  return (
    <span className="flex items-center gap-1 w-fit text-xs font-medium text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full border border-yellow-200">
      <Clock size={14} /> In Queue
    </span>
  );
};

const OtpLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering State
  const [searchPhone, setSearchPhone] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch data whenever filters change
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        // We pass the filters directly to the Axios instance
        const params = {};
        if (searchPhone) params.phone = searchPhone;
        if (statusFilter) params.status = statusFilter;
        
        const data = await dashboardApi.getOtpLogs(params);
        setLogs(data);
      } catch (error) {
        console.error("Failed to fetch OTP logs:", error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the search slightly so we don't spam the backend on every keystroke
    const timeoutId = setTimeout(() => {
      fetchLogs();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchPhone, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OTP Transaction Logs</h1>
          <p className="text-gray-500 mt-1">Search and filter historical SMS delivery records.</p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search phone number..." 
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="completed">Delivered</option>
              <option value="failed">Failed</option>
              <option value="wait">In Queue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Recipient Number</th>
                <th className="px-6 py-4">OTP Payload</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Search size={32} className="mb-3 text-gray-300" />
                      <p>No records found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{log.id}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{log.phone}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold tracking-widest text-blue-600">{log.message}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={log.status} isExpired={log.isExpired} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OtpLogs;