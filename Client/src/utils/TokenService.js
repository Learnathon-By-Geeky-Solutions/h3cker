const TokenService = {
    // Key names for local storage
    tokenKey: 'auth_token',
    userDevicesKey: 'user_devices',
    currentDeviceKey: 'current_device_id',

    tokenExpiryKey: 'auth_token_expiry',
    sessionDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds

    
    // Max number of devices allowed to be logged in simultaneously
    maxDevices: 3,
    
    /**
     * Generate a unique device ID
     * @returns {string} A unique device identifier
     */
    generateDeviceId() {
      return Date.now().toString(36) + Math.random().toString(36).substring(2);
    },
    
    /**
     * Get the current device ID or create one if it doesn't exist
     * @returns {string} The current device ID
     */
    getCurrentDeviceId() {
      let deviceId = localStorage.getItem(this.currentDeviceKey);
      
      if (!deviceId) {
        deviceId = this.generateDeviceId();
        localStorage.setItem(this.currentDeviceKey, deviceId);
      }
      
      return deviceId;
    },
    
    
    /**
     * Get the authentication token from local storage
     * @returns {string|null} The authentication token or null if not found
     */
    getToken() {
      return localStorage.getItem(this.tokenKey);
    },
    
    /**
     * Remove the authentication token from local storage
     */
    removeToken() {
      localStorage.removeItem(this.tokenKey);
    },
    
    /**
     * Add the current device to the user's device tracking
     * @param {string} uid - The user's ID 
     * @returns {boolean} True if the device was added, false if max devices reached
     */
    addDeviceToTracking(uid) {
      if (!uid) return false;
      
      const deviceId = this.getCurrentDeviceId();
      let userDevices = this.getUserDevices(uid);
      
      // If this device is already registered, just update the timestamp
      const existingDevice = userDevices.find(device => device.id === deviceId);
      if (existingDevice) {
        existingDevice.lastActive = new Date().toISOString();
        localStorage.setItem(this.userDevicesKey, JSON.stringify({
          uid,
          devices: userDevices
        }));
        return true;
      }
      
      // Check if max devices would be exceeded
      if (userDevices.length >= this.maxDevices) {
        console.warn('Maximum devices reached');
        return false;
      }
      
      // Add the new device
      userDevices.push({
        id: deviceId,
        name: this.getDeviceName(),
        lastActive: new Date().toISOString()
      });
      
      localStorage.setItem(this.userDevicesKey, JSON.stringify({
        uid,
        devices: userDevices
      }));
      
      return true;
    },
    
    /**
     * Get all devices for a user
     * @param {string} uid - The user's ID
     * @returns {Array} Array of devices
     */
    getUserDevices(uid) {
      if (!uid) return [];
      
      const storedData = localStorage.getItem(this.userDevicesKey);
      
      if (!storedData) return [];
      
      try {
        const parsed = JSON.parse(storedData);
        // Only return devices for the current user
        if (parsed.uid === uid) {
          return parsed.devices || [];
        }
        return [];
      } catch (e) {
        console.error('Error parsing user devices', e);
        return [];
      }
    },
    
    /**
     * Remove a device from tracking
     * @param {string} uid - The user's ID
     * @param {string} deviceId - The device ID to remove
     */
    removeDevice(uid, deviceId) {
      if (!uid || !deviceId) return;
      
      const userDevices = this.getUserDevices(uid);
      const updatedDevices = userDevices.filter(device => device.id !== deviceId);
      
      localStorage.setItem(this.userDevicesKey, JSON.stringify({
        uid,
        devices: updatedDevices
      }));
    },
    
    
    /**
     * Get a friendly name for the current device
     * @returns {string} A name for the current device
     */
    getDeviceName() {
      const platform = navigator.userAgentData?.platform || 'Unknown Device';
      const browser = this.getBrowserName();
      return `${browser} on ${platform}`;
    },
    
    /**
     * Get the name of the current browser
     * @returns {string} The name of the browser
     */
    getBrowserName() {
      const userAgent = navigator.userAgent;
      
      if (userAgent.indexOf("Firefox") > -1) return "Firefox";
      if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) return "Opera";
      if (userAgent.indexOf("Edge") > -1) return "Edge";
      if (userAgent.indexOf("Chrome") > -1) return "Chrome";
      if (userAgent.indexOf("Safari") > -1) return "Safari";
      if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) return "Internet Explorer";
      
      return "Unknown Browser";
    },
        /**
     * Set the authentication token in local storage with expiration
     * @param {string} token - The user's authentication token
     * @param {string} uid - The user's ID
     */
        setToken(token, uid) {
            if (!token) return;
            
            localStorage.setItem(this.tokenKey, token);
            
            // Set token expiry time (24 hours from now)
            const expiryTime = Date.now() + this.sessionDuration;
            localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
            
            // Update device tracking
            this.addDeviceToTracking(uid);
          },
          
          /**
           * Check if the current token is expired
           * @returns {boolean} True if token is expired or missing, false otherwise
           */
          isTokenExpired() {
            const token = this.getToken();
            if (!token) return true;
            
            const expiryTime = localStorage.getItem(this.tokenExpiryKey);
            if (!expiryTime) return true;
            
            return Date.now() > parseInt(expiryTime);
          },
          
          /**
           * Get time remaining until token expiry in milliseconds
           * @returns {number} Milliseconds until expiry, 0 if expired
           */
          getTimeUntilExpiry() {
            const expiryTime = localStorage.getItem(this.tokenExpiryKey);
            if (!expiryTime) return 0;
            
            const remaining = parseInt(expiryTime) - Date.now();
            return remaining > 0 ? remaining : 0;
          },
          
          /**
           * Refresh the token expiry time
           * @returns {boolean} Whether the refresh was successful
           */
          refreshExpiry() {
            const token = this.getToken();
            if (!token) return false;
            
            const expiryTime = Date.now() + this.sessionDuration;
            localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
            return true;
          },
          
          /**
           * Clear all authentication data from local storage
           */
          clearAuth() {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.tokenExpiryKey);
            // Don't remove device ID to maintain continuity
          },
  };
  
  export default TokenService;