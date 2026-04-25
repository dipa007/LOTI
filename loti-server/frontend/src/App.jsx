import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Layout from './components/Layout';

// Page Imports
import Overview from './pages/Overview'; 
import Devices from './pages/Devices';
import OtpLogs from './pages/OtpLogs';
import QueueMonitoring from './pages/QueueMonitoring';
import ActivityFeed from './pages/ActivityFeed';
import FailureLogs from './pages/FailureLogs';

// 1. Initialize the socket OUTSIDE the component so it never disconnects on page changes
const socket = io(window.location.origin, {
  transports: ['websocket'],
  autoConnect: true
});

function App() {
  // 2. Global state for logs and connection status
  const [liveEvents, setLiveEvents] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    // Track connection status
    socket.on('connect', () => setIsSocketConnected(true));
    socket.on('disconnect', () => setIsSocketConnected(false));

    // 3. Listen for events globally, no matter what page you are viewing
    socket.on('dashboard_event', (incomingEvent) => {
      setLiveEvents((prevEvents) => {
        // Add new event, attach an ID, and keep only the latest 100 to save memory
        const updated = [...prevEvents, { ...incomingEvent, id: Date.now() }];
        return updated.slice(-100);
      });
    });

    // Cleanup listeners
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('dashboard_event');
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          
          <Route index element={<Overview />} /> 
          <Route path="devices" element={<Devices />} />
          <Route path="logs" element={<OtpLogs />} />
          <Route path="queue" element={<QueueMonitoring />} />
          
          {/* 4. Pass the global logs and connection status down to the ActivityFeed */}
          <Route 
            path="activity" 
            element={
              <ActivityFeed 
                events={liveEvents} 
                isConnected={isSocketConnected} 
              />
            } 
          />
          
          <Route path="failures" element={<FailureLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;