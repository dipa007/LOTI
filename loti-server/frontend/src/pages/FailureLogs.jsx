import React, { useState, useEffect } from 'react';
import { AlertOctagon, ServerCrash, Clock, Smartphone, Search } from 'lucide-react';
import { dashboardApi } from '../services/api';

// Helper to categorize the error type based on the BullMQ failedReason string
const getErrorCategory = (reason) => {
  if (!reason) return { label: 'Unknown Error', icon: AlertOctagon, color: 'text-gray-600', bg: 'bg-gray-100' };
  
  if (reason.includes('expired in queue')) {
    return { label: 'Queue Timeout', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
  }
  if (reason.includes('did not acknowledge in time')) {
    return { label: 'Socket Timeout', icon: ServerCrash, color: 'text-orange-600', bg: 'bg-orange-100' };
  }
  if (reason.includes('Mobile phone reported')) {
    return { label: 'Hardware Error', icon: Smartphone, color: 'text-red-600', bg: 'bg-red-100' };
  }
  
  return { label: 'System Error', icon: AlertOctagon, color: 'text-red-600', bg: 'bg-red-100' };
};

const FailureLogs = () => {
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchFailures = async () => {
      try {
        const data = await dashboardApi.getFailures();
        // Sort newest first
        setFailures(data.sort((a, b) => new Date(b.failedAt) - new Date(a.failedAt)));
      } catch (error) {
        console.error("Failed to fetch failure logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFailures();
    // Poll every 5 seconds to catch new permanent failures
    const interval = setInterval(fetchFailures, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredFailures = failures.filter(f => 
    f.phone.includes(searchTerm) || (f.reason && f.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Failure Analysis</h1>
          <p className="text-gray-500 mt-1">Investigate permanent delivery failures and hardware errors.</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search phone or error reason..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Error Category</th>
                <th className="px-6 py-4">Raw Failure Reason</th>
                <th className="px-6 py-4">Recipient</th>
                <th className="px-6 py-4">Failed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading diagnostic data...</td>
                </tr>
              ) : filteredFailures.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <AlertOctagon size={32} className="mb-3 text-gray-300" />
                      <p>No failures found. The system is perfectly healthy.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFailures.map((log) => {
                  const category = getErrorCategory(log.reason);
                  const Icon = category.icon;
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{log.id}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 w-fit text-xs font-medium px-2.5 py-1 rounded-full ${category.bg} ${category.color}`}>
                          <Icon size={14} />
                          {category.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate" title={log.reason}>
                        {log.reason || 'Unknown error occurred'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-500">{log.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(log.failedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FailureLogs;