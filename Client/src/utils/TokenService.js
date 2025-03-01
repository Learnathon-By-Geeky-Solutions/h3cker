const TokenService = {
  // Key names for local storage
  tokenKey: 'auth_token',
  userDevicesKey: 'user_devices',
  currentDeviceKey: 'current_device_id',
  tokenExpiryKey: 'auth_token_expiry',
  googleAuthCacheKey: 'google_auth_cache',
  
  sessionDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  
  // Max number of devices allowed to be logged in simultaneously
  maxDevices: 3,
  
  /**
   * Generate a unique device ID using cryptographically secure random values
   * @returns {string} A unique device identifier
   */
  generateDeviceId() {
    // Create a buffer for 8 random bytes (64 bits)
    const buffer = new Uint8Array(8);
    
    // Fill with cryptographically secure random values
    window.crypto.getRandomValues(buffer);
    
    // Convert to a hex string and combine with timestamp for uniqueness
    const randomHex = Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
      
    // Include timestamp prefix for additional entropy and sortability
    const timestamp = Date.now().toString(36);
    
    return timestamp + '-' + randomHex;
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
   * Store Google authentication state securely for faster login
   * @param {Object} googleAuthState - The Google auth state to cache
   * @param {string} uid - The user's ID
   */
  setGoogleAuthCache(googleAuthState, uid) {
    if (!googleAuthState || !uid) return;
    
    try {
      // We'll encrypt the data using a simple XOR with a device-specific key
      // For production, consider more robust encryption
      const deviceKey = this.getCurrentDeviceId();
      const timestamp = Date.now();
      
      // Only store essential, non-sensitive data
      const cacheData = {
        email: googleAuthState.email,
        uid: uid,
        displayName: googleAuthState.displayName,
        photoURL: googleAuthState.photoURL,
        lastUsed: timestamp,
        // Don't store tokens or passwords
      };
      
      // Convert to string and encrypt with simple XOR (basic obfuscation)
      const dataString = JSON.stringify(cacheData);
      const encryptedData = this.simpleEncrypt(dataString, deviceKey);
      
      // Store with expiration of 30 days
      const cacheObj = {
        data: encryptedData,
        expiry: timestamp + (30 * 24 * 60 * 60 * 1000), // 30 days
      };
      
      localStorage.setItem(this.googleAuthCacheKey, JSON.stringify(cacheObj));
    } catch (error) {
      console.error('Error caching Google auth state:', error);
      // Fail gracefully - caching is a non-critical feature
      this.clearGoogleAuthCache();
    }
  },
  
  /**
   * Get cached Google authentication state if available and valid
   * @returns {Object|null} The cached auth state or null if not found/expired
   */
  getGoogleAuthCache() {
    try {
      const cachedData = localStorage.getItem(this.googleAuthCacheKey);
      if (!cachedData) return null;
      
      const cacheObj = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check if cache is expired
      if (now > cacheObj.expiry) {
        this.clearGoogleAuthCache();
        return null;
      }
      
      // Decrypt the data
      const deviceKey = this.getCurrentDeviceId();
      const decryptedData = this.simpleEncrypt(cacheObj.data, deviceKey); // XOR is reversible
      
      // Parse and return
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error retrieving Google auth cache:', error);
      this.clearGoogleAuthCache();
      return null;
    }
  },
  
  /**
   * Clear the Google authentication cache
   */
  clearGoogleAuthCache() {
    localStorage.removeItem(this.googleAuthCacheKey);
  },
  
  /**
   * Basic XOR encryption/decryption for simple obfuscation
   * @param {string} text - Text to encrypt/decrypt
   * @param {string} key - Key for encryption
   * @returns {string} - Encrypted/decrypted text
   * @private
   */
  simpleEncrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  },
  
  /**
   * Clear all authentication data from local storage
   */
  clearAuth() {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.tokenExpiryKey);
      this.clearGoogleAuthCache();
      // Don't remove device ID to maintain continuity
  }
};

export default TokenService;