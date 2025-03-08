import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const ErrorMessage = ({ error }) => {
  if (!error) return null;
  
  // Determine error styling based on content
  const isWarning = error.includes('verify');
  const isDeviceLimit = error.includes('device limit');
  
  let bgColor = 'bg-red-50 border border-red-200';
  let textColor = 'text-red-600';
  
  if (isWarning) {
    bgColor = 'bg-yellow-50 border border-yellow-200';
    textColor = 'text-yellow-800';
  } else if (isDeviceLimit) {
    bgColor = 'bg-orange-50 border border-orange-200';
    textColor = 'text-orange-800';
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={`p-3 rounded-md ${bgColor}`}
    >
      <p className={`text-sm ${textColor}`}>
        {error}
      </p>
      {isDeviceLimit && (
        <Link 
          to="/manage-devices" 
          className="block mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          Manage my devices
        </Link>
      )}
    </motion.div>
  );
};

ErrorMessage.propTypes = {
  error: PropTypes.string,
};

export default ErrorMessage;