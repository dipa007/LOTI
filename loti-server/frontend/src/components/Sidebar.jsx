import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Smartphone, FileText, ListTodo, Activity, AlertOctagon } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Devices', path: '/devices', icon: Smartphone },
    { name: 'OTP Logs', path: '/logs', icon: FileText },
    { name: 'Queue Monitoring', path: '/queue', icon: ListTodo }, // <--- Fixed here
    { name: 'Activity Feed', path: '/activity', icon: Activity },
    { name: 'Failure Logs', path: '/failures', icon: AlertOctagon },
  ];

  return (
    <div className="w-64 h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-wider text-blue-400">LOTI</h1>
        <p className="text-xs text-gray-400 mt-1">Dev Infrastructure</p>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;