import React, { useState, useEffect } from 'react';
import { ListTodo, Play, Clock, RefreshCw, AlertTriangle, CheckCircle2, ServerCrash } from 'lucide-react';
import { dashboardApi } from '../services/api';

// A specialized badge just for the queue states
const QueueBadge = ({ status }) => {
  switch (status) {
    case 'active':
      return <span className="flex items-center gap-1 w-fit text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full animate-pulse"><Play size={12} fill="currentColor" /> Processing</span>;
    case 'wait':
      return <span className="flex items-center gap-1 w-fit text-xs font-medium text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full"><Clock size={14} /> Waiting</span>;
    case 'delayed':
      return <span className="flex items-center gap-1 w-fit text-xs font-medium text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full"><RefreshCw size={14} /> Retrying</span>;
    case 'failed':
      return <span className="flex items-center gap-1 w-fit text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full"><ServerCrash size={14} /> Failed</span>;
    case 'completed':
      return <span className="flex items-center gap-1 w-fit text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full"><CheckCircle2 size={14} /> Done</span>;
    default:
      return <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
  }
};

const QueueMonitoring = () => {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueueData = async () => {
      try {
        // Fetch both endpoints in parallel for maximum speed
        const [statsData, jobsData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getJobs()
        ]);
        
        setStats(statsData.queueStatus);
        
        // Sort jobs chronologically (newest first)
        const sortedJobs = jobsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setJobs(sortedJobs);
      } catch (error) {
        console.error("Failed to fetch queue data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueueData();
    // 2-second polling to catch rapid queue movements
    const interval = setInterval(fetchQueueData, 2000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Connecting to BullMQ Engine...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Queue Engine</h1>
        <p className="text-gray-500 mt-1">Live visualization of BullMQ workers and job states.</p>
      </div>

      {/* Top Level Engine Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Waiting</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats?.wait || 0}</h3>
          </div>
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><Clock size={24} /></div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats?.active || 0}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Play size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Delayed (Retries)</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats?.delayed || 0}</h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><RefreshCw size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Processed</p>
            <h3 className="text-2xl font-bold text-gray-800">{(stats?.completed || 0) + (stats?.failed || 0)}</h3>
          </div>
          <div className="p-3 bg-gray-50 text-gray-600 rounded-lg"><ListTodo size={24} /></div>
        </div>
      </div>

      {/* Live Job Stream */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Recent Job Stream</h3>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live Sync
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold bg-white">
                <th className="px-6 py-3">Job ID</th>
                <th className="px-6 py-3">Queue Status</th>
                <th className="px-6 py-3">Recipient</th>
                <th className="px-6 py-3">Attempts</th>
                <th className="px-6 py-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.slice(0, 20).map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">#{job.id}</td>
                  <td className="px-6 py-3">
                    <QueueBadge status={job.status} />
                  </td>
                  <td className="px-6 py-3 text-sm font-mono text-gray-600">{job.phone}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      {/* Dynamically render bars based on backend config */}
                      {[...Array(job.maxAttempts)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-1.5 w-4 rounded-full ${i < job.attemptsMade ? 'bg-blue-500' : 'bg-gray-200'}`}
                        />
                      ))}
                      <span className="text-xs text-gray-500 ml-2">
                        {job.attemptsMade}/{job.maxAttempts}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {new Date(job.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QueueMonitoring;