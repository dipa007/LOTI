import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Smartphone, Clock } from 'lucide-react';
import { dashboardApi } from '../services/api';

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
    </div>
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <Icon size={24} />
    </div>
  </div>
);

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardApi.getStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Auto-refresh stats every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading infrastructure stats...</div>;
  if (!stats) return <div className="p-8 text-red-500">Error connecting to LOTI backend.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Infrastructure Overview</h1>
        <p className="text-gray-500 mt-1">Real-time metrics for your local OTP testing environment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard 
          title="Total Requests" 
          value={stats.totalRequests} 
          icon={Activity} 
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Successful Deliveries" 
          value={stats.queueStatus.completed} 
          subtitle={`${stats.successRate} Success Rate`}
          icon={CheckCircle} 
          colorClass="bg-green-50 text-green-600"
        />
        <StatCard 
          title="Failed Deliveries" 
          value={stats.queueStatus.failed} 
          icon={XCircle} 
          colorClass="bg-red-50 text-red-600"
        />
        <StatCard 
          title="Pending in Queue" 
          value={stats.queueStatus.wait} 
          icon={Clock} 
          colorClass="bg-yellow-50 text-yellow-600"
        />
        <StatCard 
          title="Active Devices" 
          value={stats.activeDevices} 
          icon={Smartphone} 
          colorClass="bg-purple-50 text-purple-600"
        />
      </div>
    </div>
  );
};

export default Overview;