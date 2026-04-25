import React, { useState } from 'react';
import { Wifi, Trash2, Loader2 } from 'lucide-react';
import { dashboardApi } from '../services/api';

const Navbar = () => {
  const [isNuking, setIsNuking] = useState(false);

  const handleNukeSystem = async () => {
    // A quick browser confirmation (Avoid booty-delete😂)
    if (!window.confirm("WARNING: This will permanently delete all logs, queue data, and reset Job IDs to #1. Continue?")) {
      return;
    }

    setIsNuking(true);
    try {
      await dashboardApi.nukeSystem();
      // Hard refresh
      window.location.reload(); 
    } catch (error) {
      console.error("Failed to nuke system", error);
      setIsNuking(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      <h2 className="text-xl font-semibold text-gray-800">Command Center</h2>
      
      <div className="flex items-center gap-6">
        
        {/* The Danger Zone Button */}
        <button 
          onClick={handleNukeSystem}
          disabled={isNuking}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-200 transition-colors disabled:opacity-50"
        >
          {isNuking ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          <span>Obliterate Data</span>
        </button>

        <div className="h-6 w-px bg-gray-200"></div> {/* Divider */}

        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-gray-600 font-medium">System Online</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
          <Wifi size={16} />
          <span>Active</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;