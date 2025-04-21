import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { ErrorMessage } from '../../common/ErrorMessage/ErrorMessage';
import { Smartphone, Laptop, Trash2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PasswordInputField = ({ password, setPassword, showPassword, setShowPassword }) => (
  <div className="space-y-1.5 sm:space-y-2 w-full">
    <label 
      htmlFor="password-confirm" 
      className="block text-xs sm:text-sm font-medium text-gray-300"
    >
      Confirm your password<span className="text-red-400 ml-1">*</span>
    </label>
    <div className="relative">
      <input
        id="password-confirm"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700/50 border border-gray-600 rounded-[12px] sm:rounded-[14px] shadow-sm text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
        required
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-2.5 sm:right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
        aria-label={showPassword ? "Hide password" : "Show password"}
        tabIndex={0}
      >
        {showPassword ? <EyeOff size={16} className="sm:w-5 sm:h-5" /> : <Eye size={16} className="sm:w-5 sm:h-5" />}
      </button>
    </div>
  </div>
);

PasswordInputField.propTypes = {
  password: PropTypes.string.isRequired,
  setPassword: PropTypes.func.isRequired,
  showPassword: PropTypes.bool.isRequired,
  setShowPassword: PropTypes.func.isRequired
};

const ActionButtons = ({ loading, handleRemoveDevice, handleCancel }) => (
  <div className="mt-4 flex space-x-3">
    <motion.button
      type="button"
      onClick={handleRemoveDevice}
      disabled={loading}
      className="relative group w-1/2 shadow-lg h-auto overflow-hidden disabled:opacity-60"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-[12px] sm:rounded-[14px] shadow-md" />
      <span className="absolute inset-0 w-full h-full bg-white/10 rounded-[12px] sm:rounded-[14px] blur-[1px]" />
      <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-[12px] sm:rounded-[14px] transform transition-transform group-hover:scale-[1.02] group-hover:brightness-110" />
      <span className="relative flex items-center justify-center text-white font-medium py-2 sm:py-2.5 text-sm">
        {loading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Removing...
          </div>
        ) : "Remove Device"}
      </span>
    </motion.button>
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      className="w-1/2 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-[12px] text-sm font-medium transition-colors disabled:opacity-50"
    >
      Cancel
    </button>
  </div>
);

ActionButtons.propTypes = {
  loading: PropTypes.bool.isRequired,
  handleRemoveDevice: PropTypes.func.isRequired,
  handleCancel: PropTypes.func.isRequired
};

const DeviceItem = ({ device, isCurrentDevice, getDeviceIcon, formatLastActive, onRemoveClick }) => (
  <motion.li
    key={device.id}
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.2 }}
    className={`p-3 rounded-[12px] flex items-center justify-between ${
      isCurrentDevice(device) 
        ? 'bg-blue-900/30 border border-blue-700' 
        : 'bg-gray-700/50 border border-gray-600'
    }`}
  >
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-full ${
        isCurrentDevice(device) ? 'bg-blue-700/50' : 'bg-gray-600/50'
      }`}>
        {getDeviceIcon(device.name)}
      </div>
      <div>
        <p className="text-white text-sm font-medium">
          {device.name} 
          {isCurrentDevice(device) && (
            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
              Current
            </span>
          )}
        </p>
        <p className="text-gray-400 text-xs">
          Last active: {formatLastActive(device.lastActive)}
        </p>
      </div>
    </div>
    
    <button
      onClick={() => onRemoveClick(device)}
      className={`p-2 rounded-full transition-colors ${
        isCurrentDevice(device)
          ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-800/50'
          : 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
      }`}
      aria-label="Remove device"
    >
      <Trash2 size={16} />
    </button>
  </motion.li>
);

DeviceItem.propTypes = {
  device: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    lastActive: PropTypes.string.isRequired
  }).isRequired,
  isCurrentDevice: PropTypes.func.isRequired,
  getDeviceIcon: PropTypes.func.isRequired,
  formatLastActive: PropTypes.func.isRequired,
  onRemoveClick: PropTypes.func.isRequired
};

const RemovalConfirmation = ({ selectedDevice, password, setPassword, showPassword, setShowPassword, error, loading, handleRemoveDevice, handleCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-4"
  >
    <div className="p-4 bg-gray-700/50 rounded-[12px] border border-gray-600">
      <h3 className="text-white font-medium mb-2">Remove Device</h3>
      <p className="text-gray-300 text-sm mb-4">
        You are about to remove access from: <span className="font-semibold text-white">{selectedDevice?.name}</span>
      </p>
      
      <div className="mb-4">
        <PasswordInputField 
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />
      </div>
      
      <AnimatePresence mode="wait">
        {error && <ErrorMessage error={error} />}
      </AnimatePresence>
      
      <ActionButtons 
        loading={loading}
        handleRemoveDevice={handleRemoveDevice}
        handleCancel={handleCancel}
      />
    </div>
  </motion.div>
);


RemovalConfirmation.propTypes = {
  selectedDevice: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }),
  password: PropTypes.string.isRequired,
  setPassword: PropTypes.func.isRequired,
  showPassword: PropTypes.bool.isRequired,
  setShowPassword: PropTypes.func.isRequired,
  error: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  handleRemoveDevice: PropTypes.func.isRequired,
  handleCancel: PropTypes.func.isRequired
};

// Separate component for the device list
const DeviceList = ({ devices, error, isCurrentDevice, getDeviceIcon, formatLastActive, handleRemoveClick, loadDevices }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-4"
  >
    {error && <ErrorMessage error={error} />}
    
    {devices.length === 0 ? (
      <p className="text-gray-400 text-center py-4">No devices found</p>
    ) : (
      <ul className="space-y-3">
        {devices.map((device) => (
          <DeviceItem 
            key={device.id}
            device={device}
            isCurrentDevice={isCurrentDevice}
            getDeviceIcon={getDeviceIcon}
            formatLastActive={formatLastActive}
            onRemoveClick={handleRemoveClick}
          />
        ))}
      </ul>
    )}
    
    <div className="text-center pt-2">
      <button
        onClick={loadDevices}
        className="text-blue-400 hover:text-blue-300 text-sm font-medium focus:outline-none"
      >
        Refresh devices
      </button>
    </div>
  </motion.div>
);

// Define PropTypes for DeviceList
DeviceList.propTypes = {
  devices: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      lastActive: PropTypes.string.isRequired
    })
  ).isRequired,
  error: PropTypes.string,
  isCurrentDevice: PropTypes.func.isRequired,
  getDeviceIcon: PropTypes.func.isRequired,
  formatLastActive: PropTypes.func.isRequired,
  handleRemoveClick: PropTypes.func.isRequired,
  loadDevices: PropTypes.func.isRequired
};

// Utility functions moved outside the main component
const getDeviceIcon = (deviceName) => {
  if (!deviceName) return <Smartphone className="h-5 w-5" />;
  
  const deviceNameLower = deviceName.toLowerCase();
  
  if (deviceNameLower.includes('mobile') || 
      deviceNameLower.includes('android') || 
      deviceNameLower.includes('ios') || 
      deviceNameLower.includes('iphone')) {
    return <Smartphone className="h-5 w-5" />;
  }
  
  return <Laptop className="h-5 w-5" />;
};

const formatLastActive = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    // Less than 1 minute
    if (diffMs < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diffMs < 3600000) {
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // Less than 1 day
    if (diffMs < 86400000) {
      const hours = Math.floor(diffMs / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    // Less than 7 days
    if (diffMs < 604800000) {
      const days = Math.floor(diffMs / 86400000);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    
    // Format as date
    return date.toLocaleDateString();
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Unknown';
  }
};

const DeviceManager = () => {
  const { getUserDevices, removeDevice, maxDevices } = useContext(AuthContext);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError('');
      const userDevices = await getUserDevices();
      
      // Sort devices
      const sortedDevices = sortDevices(userDevices);
      setDevices(sortedDevices);
    } catch (err) {
      console.error("Error loading devices:", err);
      setError("Failed to load your devices. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sortDevices = (userDevices) => {
    return userDevices.sort((a, b) => {
      // Current device first
      if (a.id === window.TokenService?.getCurrentDeviceId()) return -1;
      if (b.id === window.TokenService?.getCurrentDeviceId()) return 1;
      
      return new Date(b.lastActive) - new Date(a.lastActive);
    });
  };

  const handleRemoveClick = (device) => {
    setSelectedDevice(device);
    setPassword('');
    setRemoving(true);
    setError('');
  };

  const handleCancel = () => {
    setRemoving(false);
    setSelectedDevice(null);
    setPassword('');
    setError('');
  };

  const handleRemoveDevice = async () => {
    if (!selectedDevice || !password) {
      setError("Please enter your password to confirm device removal");
      return;
    }

    try {
      setLoading(true);
      const result = await removeDevice(selectedDevice.id, password);
      
      handleRemoveSuccess(result);
    } catch (err) {
      handleRemoveError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSuccess = async (result) => {
    if (result) {
      setSuccess(`Device "${selectedDevice.name}" has been removed`);
      setTimeout(() => setSuccess(''), 3000);
      if (selectedDevice.id !== window.TokenService?.getCurrentDeviceId()) {
        await loadDevices();
      }
      
      setRemoving(false);
      setSelectedDevice(null);
      setPassword('');
    } else {
      setError("Failed to remove device. Please check your password and try again.");
    }
  };

  const handleRemoveError = (err) => {
    console.error("Error removing device:", err);
    if (err.message === 'INVALID_PASSWORD') {
      setError("Incorrect password. Please try again.");
    } else {
      setError("An error occurred. Please try again later.");
    }
  };

  const isCurrentDevice = (device) => {
    return device.id === window.TokenService?.getCurrentDeviceId();
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-20 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center">
          <button 
            onClick={handleBackClick} 
            className="mr-3 p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-white">Device Management</h1>
        </div>
        
        <div className="bg-gray-800/80 backdrop-blur-md rounded-[16px] border border-gray-700 shadow-md p-4 sm:p-6 w-full">
          <AnimatePresence mode="wait">
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-green-800/40 border border-green-700 rounded-[12px] text-green-400 text-sm"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mb-4">
            <p className="text-gray-300 text-sm">
              You can be logged in on up to <span className="font-semibold text-white">{maxDevices}</span> devices at the same time.
            </p>
            <p className="text-gray-300 text-sm mt-1">
              Current active devices: <span className="font-semibold text-white">{devices.length}</span> of {maxDevices}
            </p>
          </div>
          
          {loading && !removing ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-gray-400 mt-2">Loading your devices...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {removing ? (
                <RemovalConfirmation
                  selectedDevice={selectedDevice}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  error={error}
                  loading={loading}
                  handleRemoveDevice={handleRemoveDevice}
                  handleCancel={handleCancel}
                />
              ) : (
                <DeviceList
                  devices={devices}
                  error={error}
                  isCurrentDevice={isCurrentDevice}
                  getDeviceIcon={getDeviceIcon}
                  formatLastActive={formatLastActive}
                  handleRemoveClick={handleRemoveClick}
                  loadDevices={loadDevices}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceManager;