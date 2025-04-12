const TokenService = {
  tokenKey: 'auth_token',
  userDevicesKey: 'user_devices',
  currentDeviceKey: 'current_device_id',
  tokenExpiryKey: 'auth_token_expiry',
  googleAuthCacheKey: 'google_auth_cache',
  profileUpdateTimeKey: 'profile_last_update_time',
  lastTokenSetTimeKey: 'last_token_set_time',

  sessionDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  tokenRateLimitMs: 1000, // Minimum time between token sets (1 second)

  // Max number of devices allowed to be logged in simultaneously
  maxDevices: 3,

  /**
   * Generate a unique device ID using cryptographically secure random values
   * @returns {string} A unique device identifier
   */
  generateDeviceId() {
    const buffer = new Uint8Array(8);
    window.crypto.getRandomValues(buffer);
    const randomHex = Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
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
   * Check if token operations are being rate limited
   * @returns {boolean} True if rate limited, false otherwise
   */
  isRateLimited() {
    const lastSetTime = localStorage.getItem(this.lastTokenSetTimeKey);
    if (!lastSetTime) return false;
    
    const timeSinceLastSet = Date.now() - parseInt(lastSetTime, 10);
    return timeSinceLastSet < this.tokenRateLimitMs;
  },

  /**
   * Update the last token set timestamp
   */
  updateLastTokenSetTime() {
    localStorage.setItem(this.lastTokenSetTimeKey, Date.now().toString());
  },

  /**
   * Handle device tracking for a user
   * @param {string} uid - The user's ID
   * @returns {boolean} Success status of the operation
   */
  handleDeviceTracking(uid) {
    if (!uid) return false;

    const deviceId = this.getCurrentDeviceId();
    let userDevices = this.getUserDevices(uid);

    // Update existing device
    const existingDeviceIndex = userDevices.findIndex(device => device.id === deviceId);
    if (existingDeviceIndex >= 0) {
      userDevices[existingDeviceIndex].lastActive = new Date().toISOString();
      this.storeUserDevices(uid, userDevices);
      return true;
    }

    if (userDevices.length >= this.maxDevices) {
      console.warn('Maximum devices reached');
      return false;
    }

    userDevices.push({
      id: deviceId,
      name: this.getDeviceName(),
      lastActive: new Date().toISOString()
    });

    this.storeUserDevices(uid, userDevices);
    return true;
  },

  /**
   * Store user devices in local storage
   * @param {string} uid - The user's ID
   * @param {Array} devices - Array of device objects
   */
  storeUserDevices(uid, devices) {
    localStorage.setItem(this.userDevicesKey, JSON.stringify({
      uid,
      devices
    }));
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
      return (parsed.uid === uid) ? (parsed.devices || []) : [];
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
    this.storeUserDevices(uid, updatedDevices);
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

    if (userAgent.indexOf("Edg") > -1) return "Edge";
    if (userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Safari") > -1 && userAgent.indexOf("OPR") === -1) return "Chrome";
    if (userAgent.indexOf("Firefox") > -1) return "Firefox";
    if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) return "Safari";
    if (userAgent.indexOf("OPR") > -1 || userAgent.indexOf("Opera") > -1) return "Opera";
    if (userAgent.indexOf("Trident") > -1 || userAgent.indexOf("MSIE") > -1) return "Internet Explorer";

    return "Unknown Browser";
  },

  /**
   * Set the authentication token in local storage with expiration
   * @param {string} token - The user's authentication token
   * @param {string} uid - The user's ID
   */
  setToken(token, uid) {
    if (!token || !uid) {
      console.error("setToken requires both token and uid.");
      return;
    }

    // Prevent rapid token refreshes
    if (this.isRateLimited()) {
      console.debug("Token set rate limited. Skipping redundant token update.");
      return;
    }

    // Check if token is already set and hasn't changed
    const currentToken = this.getToken();
    if (currentToken === token) {
      console.debug("Token unchanged. Skipping redundant update.");
      return;
    }

    // Update token and expiry time
    localStorage.setItem(this.tokenKey, token);
    const expiryTime = Date.now() + this.sessionDuration;
    localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
    
    // Track when we last set a token (for rate limiting)
    this.updateLastTokenSetTime();
    
    console.log(`Token set. Expires at: ${new Date(expiryTime).toLocaleString()}`);

    // Update device tracking
    this.handleDeviceTracking(uid);
  },

  /**
   * Check if the current token is expired
   * @returns {boolean} True if token is expired or missing, false otherwise
   */
  isTokenExpired() {
    const token = this.getToken();
    if (!token) return true;

    const expiryTimeStr = localStorage.getItem(this.tokenExpiryKey);
    if (!expiryTimeStr) {
      console.warn("Token expiry check: Expiry time missing.");
      return true;
    }

    const expiryTime = parseInt(expiryTimeStr, 10);
    if (isNaN(expiryTime)) {
      console.error("Token expiry check: Invalid expiry time format.");
      this.clearAuth();
      return true;
    }

    return Date.now() > expiryTime;
  },

  /**
   * Get time remaining until token expiry in milliseconds
   * @returns {number} Milliseconds until expiry, 0 if expired or error
   */
  getTimeUntilExpiry() {
    const expiryTimeStr = localStorage.getItem(this.tokenExpiryKey);
    if (!expiryTimeStr) return 0;

    const expiryTime = parseInt(expiryTimeStr, 10);
    if (isNaN(expiryTime)) return 0;

    const remaining = expiryTime - Date.now();
    return remaining > 0 ? remaining : 0;
  },

  /**
   * Refresh the token expiry time (call this on user activity)
   * @returns {boolean} Whether the refresh was successful
   */
  refreshExpiry() {
    const token = this.getToken();
    if (!token || this.isTokenExpired()) return false;

    // Prevent rapid refreshes
    if (this.isRateLimited()) return false;

    const expiryTime = Date.now() + this.sessionDuration;
    localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
    this.updateLastTokenSetTime();
    
    console.log(`Token expiry refreshed. New expiry: ${new Date(expiryTime).toLocaleString()}`);
    return true;
  },

  /**
   * Encrypt/decrypt data with basic XOR obfuscation
   * @param {string} text - Text to encrypt/decrypt
   * @param {string} key - Key for obfuscation
   * @returns {string} - Obfuscated/de-obfuscated text
   * @private
   */
  simpleEncrypt(text, key) {
    if (!key) return text;
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return result;
  },

  /**
   * Store Google authentication state securely for faster login hints
   * @param {Object} googleAuthState - The Google auth state object
   * @param {string} uid - The user's ID
   */
  setGoogleAuthCache(googleAuthState, uid) {
    if (!googleAuthState || !uid) return;

    try {
      const deviceKey = this.getCurrentDeviceId();
      const timestamp = Date.now();
      const cacheExpiry = timestamp + (7 * 24 * 60 * 60 * 1000); // 7 days

      const cacheData = {
        email: googleAuthState.email,
        uid: uid,
        displayName: googleAuthState.displayName,
        photoURL: googleAuthState.photoURL,
        lastUsed: timestamp,
      };

      const dataString = JSON.stringify(cacheData);
      const encryptedData = this.simpleEncrypt(dataString, deviceKey);

      localStorage.setItem(this.googleAuthCacheKey, JSON.stringify({
        data: encryptedData,
        expiry: cacheExpiry,
      }));
    } catch (error) {
      console.error('Error caching Google auth state:', error);
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
      if (Date.now() > cacheObj.expiry) {
        this.clearGoogleAuthCache();
        return null;
      }

      const deviceKey = this.getCurrentDeviceId();
      const decryptedData = this.simpleEncrypt(cacheObj.data, deviceKey);
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
   * Set the last profile update timestamp
   * @param {string} uid - The user's ID
   * @param {Date} timestamp - The timestamp of the update (defaults to now)
   */
  setProfileUpdateTime(uid, timestamp = new Date()) {
    if (!uid) return;
    localStorage.setItem(`${this.profileUpdateTimeKey}_${uid}`, timestamp.getTime().toString());
  },

  /**
   * Get the last profile update timestamp
   * @param {string} uid - The user's ID
   * @returns {Date|null} The timestamp of the last update or null if not found
   */
  getProfileUpdateTime(uid) {
    if (!uid) return null;

    const timestampStr = localStorage.getItem(`${this.profileUpdateTimeKey}_${uid}`);
    if (!timestampStr) return null;

    const timestamp = parseInt(timestampStr, 10);
    return isNaN(timestamp) ? null : new Date(timestamp);
  },

  /**
   * Check if profile can be updated (based on time restriction)
   * @param {string} uid - The user's ID
   * @param {number} minDays - Minimum days between updates (default: 1)
   * @returns {boolean} Whether the profile can be updated
   */
  canUpdateProfile(uid, minDays = 1) {
    if (!uid) return true;

    const lastUpdate = this.getProfileUpdateTime(uid);
    if (!lastUpdate) return true;

    const now = new Date();
    const daysSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastUpdate >= minDays;
  },

  /**
   * Clear all authentication-related data from local storage upon logout
   */
  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenExpiryKey);
    localStorage.removeItem(this.lastTokenSetTimeKey);
    this.clearGoogleAuthCache();
    console.log('Authentication data cleared.');
  }
};

export default TokenService;