import React, { useEffect, useRef } from 'react';
import { Activity, Smartphone, Server, CheckCircle2, AlertTriangle, Zap, Clock } from 'lucide-react';

// Map event types to specific icons and colors
const getEventTheme = (type) => {
  switch (type) {
    case 'device_online':
      return { icon: Smartphone, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' };
    case 'device_offline':
      return { icon: Smartphone, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' };
    case 'job_queued':
      return { icon: Server, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' };
    case 'sms_sent':
      return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' };
    case 'sms_failed':
      return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' };
    default:
      return { icon: Zap, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' };
  }
};


const ActivityFeed = ({ events = [], isConnected = false }) => {
  const feedEndRef = useRef(null);
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Activity Feed</h1>
          <p className="text-gray-500 mt-1">Real-time socket stream of all infrastructure events.</p>
        </div>
        
        {/* Socket Connection Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
          isConnected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          <span className="relative flex h-2 w-2">
            {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </span>
          {isConnected ? 'Socket Connected' : 'Socket Disconnected'}
        </div>
      </div>

      {/* Terminal-style Feed Container */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex items-center gap-2">
          <Activity size={18} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 font-mono tracking-wider">SYSTEM.LOGS</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 font-mono text-sm">
              <Clock className="mb-2 opacity-50" size={24} />
              Waiting for live events...
            </div>
          ) : (
            events.map((event) => {
              const theme = getEventTheme(event.type);
              const Icon = theme.icon;
              
              return (
                <div key={event.id} className="flex gap-4 group">
                  <div className={`mt-1 shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${theme.bg} ${theme.border} ${theme.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{event.title}</span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{event.message}</p>
                    {event.meta && (
                      <p className="text-xs text-gray-400 font-mono mt-1 bg-gray-50 p-2 rounded-md border border-gray-100 inline-block">
                        {event.meta}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={feedEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ActivityFeed;