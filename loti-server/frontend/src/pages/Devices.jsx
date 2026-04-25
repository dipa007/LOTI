import React, { useState, useEffect } from 'react';
import { Smartphone, Wifi, WifiOff, Clock } from 'lucide-react';
import { dashboardApi } from '../services/api';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const data = await dashboardApi.getDevices();
        setDevices(data);
      } catch (error) {
        console.error("Failed to fetch devices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
    // Aggressive 3-second polling for near real-time device status
    const interval = setInterval(fetchDevices, 3000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading devices...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Device Management</h1>
        <p className="text-gray-500 mt-1">Monitor connected Android testing hardware.</p>
      </div>

      {devices.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <Smartphone className="text-gray-300 mb-4" size={48} />
          <h3 className="text-xl font-medium text-gray-900">No Devices Found</h3>
          <p className="text-gray-500 mt-2 max-w-sm">
            There are no device states registered in Redis. Connect your React Native app to log a worker node.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <div key={device.deviceId} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${device.status === 'online' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{device.deviceId}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-1">Socket: {device.socketId.slice(0, 8)}...</p>
                  </div>
                </div>
                {device.status === 'online' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full border border-green-200">
                    <Wifi size={14} /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
                    <WifiOff size={14} /> Offline
                  </span>
                )}
              </div>
              
              <div className="space-y-2 border-t border-gray-100 pt-4 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={16} className="text-gray-400" />
                  <span>
                    {device.status === 'online' 
                      ? `Connected at: ${new Date(device.connectedAt).toLocaleTimeString()}`
                      : `Lost connection: ${new Date(device.disconnectedAt).toLocaleTimeString()}`
                    }
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Devices;