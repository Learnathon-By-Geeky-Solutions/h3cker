// --- START OF FILE TokenService.js ---

const TokenService = {
  // Key names for local storage
  tokenKey: 'auth_token',
  userDevicesKey: 'user_devices',
  currentDeviceKey: 'current_device_id',
  tokenExpiryKey: 'auth_token_expiry',
  googleAuthCacheKey: 'google_auth_cache',
  profileUpdateTimeKey: 'profile_last_update_time',

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
      // Optional: Implement logic to remove the oldest device
      // userDevices.sort((a, b) => new Date(a.lastActive) - new Date(b.lastActive));
      // userDevices = userDevices.slice(1); // Remove the oldest
      // Fall through to add the new device after removing oldest, or return false here
      return false; // Current behavior: Deny login on new device
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
    // navigator.userAgentData is experimental, provide fallbacks
    const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown Device';
    const browser = this.getBrowserName();
    return `${browser} on ${platform}`;
  },

  /**
   * Get the name of the current browser
   * @returns {string} The name of the browser
   */
  getBrowserName() {
    const userAgent = navigator.userAgent;

    // Order matters here - check Edge/Chrome/Safari before generic terms
    if (userAgent.indexOf("Edg") > -1) return "Edge"; // Modern Edge (Chromium based)
    if (userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Safari") > -1 && userAgent.indexOf("OPR") === -1) return "Chrome";
    if (userAgent.indexOf("Firefox") > -1) return "Firefox";
    if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) return "Safari";
    if (userAgent.indexOf("OPR") > -1 || userAgent.indexOf("Opera") > -1) return "Opera";
    if (userAgent.indexOf("Trident") > -1 || userAgent.indexOf("MSIE") > -1) return "Internet Explorer"; // Older IE

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

      localStorage.setItem(this.tokenKey, token);

      // Set token expiry time (24 hours from now)
      const expiryTime = Date.now() + this.sessionDuration;
      localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
      console.log(`Token set. Expires at: ${new Date(expiryTime).toLocaleString()}`);

      // Update device tracking
      this.addDeviceToTracking(uid);
  },

  /**
   * Check if the current token is expired
   * @returns {boolean} True if token is expired or missing, false otherwise
   */
  isTokenExpired() {
      const token = this.getToken();
      if (!token) {
          // console.log("Token expired check: No token found.");
          return true;
      }

      const expiryTimeStr = localStorage.getItem(this.tokenExpiryKey);
      if (!expiryTimeStr) {
           console.warn("Token expiry check: Expiry time missing.");
           return true;
      }

      const expiryTime = parseInt(expiryTimeStr, 10);
       if (isNaN(expiryTime)) {
           console.error("Token expiry check: Invalid expiry time format.");
           // Treat as expired if invalid
           this.clearAuth(); // Clear invalid state
           return true;
       }

      const isExpired = Date.now() > expiryTime;
    //   if (isExpired) {
    //       console.log(`Token expired check: Expired at ${new Date(expiryTime).toLocaleString()}`);
    //   } else {
    //       console.log(`Token expiry check: Valid until ${new Date(expiryTime).toLocaleString()}`);
    //   }
      return isExpired;
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
      if (!token || this.isTokenExpired()) { // Don't refresh if already expired or no token
          return false;
      }

      const expiryTime = Date.now() + this.sessionDuration;
      localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
      console.log(`Token expiry refreshed. New expiry: ${new Date(expiryTime).toLocaleString()}`);
      return true;
  },

  /**
   * Store Google authentication state securely for faster login hints
   * @param {Object} googleAuthState - The Google auth state object (e.g., from Firebase auth result)
   * @param {string} uid - The user's ID
   */
  setGoogleAuthCache(googleAuthState, uid) {
    if (!googleAuthState || !uid) return;

    try {
      // Use a device-specific key for basic obfuscation
      const deviceKey = this.getCurrentDeviceId();
      const timestamp = Date.now();

      // Only store essential, non-sensitive data for login hints
      const cacheData = {
        email: googleAuthState.email,
        uid: uid, // Store UID for matching
        displayName: googleAuthState.displayName,
        photoURL: googleAuthState.photoURL,
        lastUsed: timestamp,
        // DO NOT store tokens, passwords, or provider-specific credentials
      };

      // Convert to string and encrypt with simple XOR (basic obfuscation only, not true security)
      const dataString = JSON.stringify(cacheData);
      const encryptedData = this.simpleEncrypt(dataString, deviceKey);

      // Store with expiration (e.g., 7 days)
      const cacheObj = {
        data: encryptedData,
        expiry: timestamp + (7 * 24 * 60 * 60 * 1000), // 7 days
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

      // Decrypt the data using the current device key
      const deviceKey = this.getCurrentDeviceId();
      const decryptedData = this.simpleEncrypt(cacheObj.data, deviceKey); // XOR is reversible

      // Parse and return the cached user info
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error retrieving Google auth cache:', error);
      this.clearGoogleAuthCache(); // Clear corrupted cache
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
    if (!uid) return true; // Or false, depending on desired behavior for anonymous users

    const lastUpdate = this.getProfileUpdateTime(uid);
    if (!lastUpdate) return true; // Allow first update

    const now = new Date();
    const daysSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceLastUpdate >= minDays;
  },

  /**
   * Basic XOR encryption/decryption for simple obfuscation (NOT secure encryption)
   * @param {string} text - Text to encrypt/decrypt
   * @param {string} key - Key for obfuscation
   * @returns {string} - Obfuscated/de-obfuscated text
   * @private
   */
  simpleEncrypt(text, key) {
    if (!key) return text; // Cannot encrypt without a key
    let result = '';
    for (let i = 0; i < text.length; i++) {
      // XOR character code with corresponding key character code (wrapping key)
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  },

  /**
   * Clear all authentication-related data from local storage upon logout
   */
  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenExpiryKey);
    this.clearGoogleAuthCache(); // Clear login hints
    // Optional: Clear user devices if you want to force re-login on all devices
    // localStorage.removeItem(this.userDevicesKey);
    // Optional: Don't remove currentDeviceKey to potentially recognize the device later
    console.log('Authentication data cleared.');
  }
};

export default TokenService;
// --- END OF FILE TokenService.js ---