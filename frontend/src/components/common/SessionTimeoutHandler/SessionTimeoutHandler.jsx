import React, { useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { X } from 'lucide-react';

/**
 * Formats milliseconds into a user-friendly time string (minutes:seconds)
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
const formatTimeRemaining = (ms) => {
  if (!ms) return '0:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SessionTimeoutHandler = () => {
  const { 
    user, 
    sessionExpiring, 
    sessionTimeRemaining, 
    extendSession, 
    logout 
  } = useContext(AuthContext);
  
  const [timeDisplay, setTimeDisplay] = useState('');
  
  // Update the countdown timer
  useEffect(() => {
    if (!sessionExpiring || !sessionTimeRemaining) {
      setTimeDisplay('');
      return;
    }
    
    setTimeDisplay(formatTimeRemaining(sessionTimeRemaining));
    
    // Update the timer every second
    const intervalId = setInterval(() => {
      if (sessionTimeRemaining <= 0) {
        clearInterval(intervalId);
        return;
      }
      
      const newRemaining = sessionTimeRemaining - 1000;
      setTimeDisplay(formatTimeRemaining(Math.max(0, newRemaining)));
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [sessionExpiring, sessionTimeRemaining]);
  
  // If no user or not expiring, don't show anything
  if (!user || !sessionExpiring) {
    return null;
  }
  
  return (
    <AnimatePresence>
      {sessionExpiring && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50 max-w-md bg-white rounded-lg shadow-xl border border-yellow-200"
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 w-0 flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  Session Expiring
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your session will expire in <span className="font-medium text-yellow-600">{timeDisplay}</span>. 
                  Would you like to extend your session?
                </p>
                <div className="mt-3 flex space-x-3">
                  <button
                    type="button"
                    onClick={extendSession}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Extend session
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Logout now
                  </button>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className="inline-flex text-gray-400 hover:text-gray-500"
                  onClick={() => {}}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionTimeoutHandler;