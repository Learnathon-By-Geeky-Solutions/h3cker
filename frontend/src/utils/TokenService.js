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
   * Safe wrapper for localStorage access
   * Handles cases where localStorage might be unavailable or blocked
   */
  _storage: {
    getItem(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error(`Storage error retrieving ${key}:`, error);
        return null;
      }
    },
    
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.error(`Storage error setting ${key}:`, error);
        return false;
      }
    },
    
    removeItem(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error(`Storage error removing ${key}:`, error);
        return false;
      }
    }
  },

  /**
   * Generate a unique device ID using cryptographically secure random values
   * @returns {string} A unique device identifier
   */
  generateDeviceId() {
    try {
      // First try the most secure method
      if (window.crypto?.getRandomValues) {
        const buffer = new Uint8Array(8);
        window.crypto.getRandomValues(buffer);
        const randomHex = Array.from(buffer)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        const timestamp = Date.now().toString(36);
        return timestamp + '-' + randomHex;
      }
      
      // Fallback for older browsers
      throw new Error('Crypto API not available');
    } catch (error) {
      console.error('Error generating device ID using crypto:', error);

      // Use a less secure but more compatible approach
      const timestamp = Date.now().toString(36);
      const randomChars = Math.random().toString(36).substring(2, 10);
      const perfNow = typeof performance !== 'undefined' && performance.now ? 
                     Math.floor(performance.now() * 1000).toString(36) : 
                     timestamp.split('').reverse().join('');
      return timestamp + '-' + randomChars + '-' + perfNow;
    }
  },

  /**
   * Get the current device ID or create one if it doesn't exist
   * @returns {string} The current device ID
   */
  getCurrentDeviceId() {
    try {
      let deviceId = this._storage.getItem(this.currentDeviceKey);
      if (!deviceId) {
        deviceId = this.generateDeviceId();
        this._storage.setItem(this.currentDeviceKey, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting current device ID:', error);
      // Return a temporary ID without storing it
      return this.generateDeviceId();
    }
  },

  /**
   * Get the authentication token from local storage
   * @returns {string|null} The authentication token or null if not found
   */
  getToken() {
    try {
      return this._storage.getItem(this.tokenKey);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  /**
   * Check if token operations are being rate limited
   * @returns {boolean} True if rate limited, false otherwise
   */
  isRateLimited() {
    try {
      const lastSetTime = this._storage.getItem(this.lastTokenSetTimeKey);
      if (!lastSetTime) return false;
      
      const timeSinceLastSet = Date.now() - parseInt(lastSetTime, 10);
      return timeSinceLastSet < this.tokenRateLimitMs;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }
  },

  /**
   * Update the last token set timestamp
   */
  updateLastTokenSetTime() {
    try {
      this._storage.setItem(this.lastTokenSetTimeKey, Date.now().toString());
    } catch (error) {
      console.error('Error updating last token set time:', error);
    }
  },

  /**
   * Handle device tracking for a user
   * @param {string} uid - The user's ID
   * @returns {boolean} Success status of the operation
   */
  handleDeviceTracking(uid) {
    try {
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
    } catch (error) {
      console.error('Error handling device tracking:', error);
      return false;
    }
  },

  /**
   * Store user devices in local storage
   * @param {string} uid - The user's ID
   * @param {Array} devices - Array of device objects
   */
  storeUserDevices(uid, devices) {
    try {
      this._storage.setItem(this.userDevicesKey, JSON.stringify({
        uid,
        devices
      }));
    } catch (error) {
      console.error('Error storing user devices:', error);
    }
  },

  /**
   * Get all devices for a user
   * @param {string} uid - The user's ID
   * @returns {Array} Array of devices
   */
  getUserDevices(uid) {
    try {
      if (!uid) return [];

      const storedData = this._storage.getItem(this.userDevicesKey);
      if (!storedData) return [];

      try {
        const parsed = JSON.parse(storedData);
        return (parsed.uid === uid) ? (parsed.devices || []) : [];
      } catch (parseError) {
        console.error('Error parsing user devices JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error retrieving user devices:', error);
      return [];
    }
  },

  /**
   * Remove a device from tracking
   * @param {string} uid - The user's ID
   * @param {string} deviceId - The device ID to remove
   */
  removeDevice(uid, deviceId) {
    try {
      if (!uid || !deviceId) return;

      const userDevices = this.getUserDevices(uid);
      const updatedDevices = userDevices.filter(device => device.id !== deviceId);
      this.storeUserDevices(uid, updatedDevices);
    } catch (error) {
      console.error('Error removing device:', error);
    }
  },

  /**
   * Get a friendly name for the current device
   * @returns {string} A name for the current device
   */
  getDeviceName() {
    try {
      let platform = 'Unknown Device';
      
      // Use newer API first, fall back to deprecated properties with warning
      if (navigator.userAgentData?.platform) {
        platform = navigator.userAgentData.platform;
      } else {
        // Using alternative detection to avoid deprecated property
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Win')) platform = 'Windows';
        else if (userAgent.includes('Mac')) platform = 'macOS';
        else if (userAgent.includes('Linux')) platform = 'Linux';
        else if (userAgent.includes('Android')) platform = 'Android';
        else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS';
      }
      
      const browser = this.getBrowserName();
      return `${browser} on ${platform}`;
    } catch (error) {
      console.error('Error getting device name:', error);
      return 'Unknown Device';
    }
  },

  /**
   * Get the name of the current browser
   * @returns {string} The name of the browser
   */
  getBrowserName() {
    try {
      const userAgent = navigator.userAgent;

      // Edge needs to be checked before Chrome due to its user agent string
      if (userAgent.indexOf("Edg") > -1) return "Edge";
      if (userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Safari") > -1 && userAgent.indexOf("OPR") === -1) return "Chrome";
      if (userAgent.indexOf("Firefox") > -1) return "Firefox";
      if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) return "Safari";
      if (userAgent.indexOf("OPR") > -1 || userAgent.indexOf("Opera") > -1) return "Opera";
      if (userAgent.indexOf("Trident") > -1 || userAgent.indexOf("MSIE") > -1) return "Internet Explorer";

      return "Unknown Browser";
    } catch (error) {
      console.error('Error getting browser name:', error);
      return "Unknown Browser";
    }
  },

  /**
   * Set the authentication token in local storage with expiration
   * @param {string} token - The user's authentication token
   * @param {string} uid - The user's ID
   */
  setToken(token, uid) {
    try {
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
      this._storage.setItem(this.tokenKey, token);
      const expiryTime = Date.now() + this.sessionDuration;
      this._storage.setItem(this.tokenExpiryKey, expiryTime.toString());
      
      // Track when we last set a token (for rate limiting)
      this.updateLastTokenSetTime();
      
      // Set a session cookie as a backup for browsers with localStorage issues
      try {
        document.cookie = `auth_token_backup=${encodeURIComponent(token)};path=/;max-age=${this.sessionDuration/1000}`;
        document.cookie = `auth_uid_backup=${encodeURIComponent(uid)};path=/;max-age=${this.sessionDuration/1000}`;
      } catch (cookieError) {
        console.error('Error setting backup cookie:', cookieError);
      }
      
      console.log(`Token set. Expires at: ${new Date(expiryTime).toLocaleString()}`);

      // Update device tracking
      this.handleDeviceTracking(uid);
    } catch (error) {
      console.error('Error setting token:', error);
      
      // Try setting backup cookie if localStorage fails
      try {
        document.cookie = `auth_token_backup=${encodeURIComponent(token)};path=/;max-age=${this.sessionDuration/1000}`;
        document.cookie = `auth_uid_backup=${encodeURIComponent(uid)};path=/;max-age=${this.sessionDuration/1000}`;
      } catch (cookieError) {
        console.error('Error setting backup cookie:', cookieError);
      }
    }
  },

  /**
   * Check if the current token is expired
   * @returns {boolean} True if token is expired or missing, false otherwise
   */
  isTokenExpired() {
    try {
      const token = this.getToken();
      if (!token) {
        // Try to fall back to cookie if localStorage token is missing
        const cookieToken = this.getTokenFromCookie();
        if (cookieToken) {
          // Restore from cookie
          const cookieUid = this.getUidFromCookie();
          if (cookieUid) {
            this._storage.setItem(this.tokenKey, cookieToken);
            return false;
          }
        }
        return true;
      }

      const expiryTimeStr = this._storage.getItem(this.tokenExpiryKey);
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
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  },

  /**
   * Get token from cookie (fallback method)
   * @returns {string|null} Token from cookie or null
   */
  getTokenFromCookie() {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const trimmedCookie = cookie.trim();
        if (trimmedCookie.startsWith('auth_token_backup=')) {
          return decodeURIComponent(trimmedCookie.substring('auth_token_backup='.length));
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting token from cookie:', error);
      return null;
    }
  },

  /**
   * Get UID from cookie (fallback method)
   * @returns {string|null} UID from cookie or null
   */
  getUidFromCookie() {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const trimmedCookie = cookie.trim();
        if (trimmedCookie.startsWith('auth_uid_backup=')) {
          return decodeURIComponent(trimmedCookie.substring('auth_uid_backup='.length));
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting UID from cookie:', error);
      return null;
    }
  },

  /**
   * Get time remaining until token expiry in milliseconds
   * @returns {number} Milliseconds until expiry, 0 if expired or error
   */
  getTimeUntilExpiry() {
    try {
      const expiryTimeStr = this._storage.getItem(this.tokenExpiryKey);
      if (!expiryTimeStr) return 0;

      const expiryTime = parseInt(expiryTimeStr, 10);
      if (isNaN(expiryTime)) return 0;

      const remaining = expiryTime - Date.now();
      return remaining > 0 ? remaining : 0;
    } catch (error) {
      console.error('Error getting time until expiry:', error);
      return 0;
    }
  },

  /**
   * Refresh the token expiry time (call this on user activity)
   * @returns {boolean} Whether the refresh was successful
   */
  refreshExpiry() {
    try {
      const token = this.getToken();
      if (!token || this.isTokenExpired()) return false;

      // Prevent rapid refreshes
      if (this.isRateLimited()) return false;

      const expiryTime = Date.now() + this.sessionDuration;
      this._storage.setItem(this.tokenExpiryKey, expiryTime.toString());
      this.updateLastTokenSetTime();
      
      // Update session cookie expiry as well
      try {
        const cookieToken = this.getTokenFromCookie();
        if (cookieToken) {
          document.cookie = `auth_token_backup=${encodeURIComponent(cookieToken)};path=/;max-age=${this.sessionDuration/1000}`;
        }
        
        const cookieUid = this.getUidFromCookie();
        if (cookieUid) {
          document.cookie = `auth_uid_backup=${encodeURIComponent(cookieUid)};path=/;max-age=${this.sessionDuration/1000}`;
        }
      } catch (cookieError) {
        console.error('Error refreshing backup cookie:', cookieError);
      }
      
      console.log(`Token expiry refreshed. New expiry: ${new Date(expiryTime).toLocaleString()}`);
      return true;
    } catch (error) {
      console.error('Error refreshing expiry:', error);
      return false;
    }
  },

  /**
   * Encrypt/decrypt data with basic XOR obfuscation
   * @param {string} text - Text to encrypt/decrypt
   * @param {string} key - Key for obfuscation
   * @returns {string} - Obfuscated/de-obfuscated text
   * @private
   */
  simpleEncrypt(text, key) {
    try {
      if (!key || !text) return text;
      
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      
      return result;
    } catch (error) {
      console.error('Error during encryption/decryption:', error);
      return text;
    }
  },

  /**
   * Store Google authentication state securely for faster login hints
   * @param {Object} googleAuthState - The Google auth state object
   * @param {string} uid - The user's ID
   */
  setGoogleAuthCache(googleAuthState, uid) {
    try {
      if (!googleAuthState || !uid) return;

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

      this._storage.setItem(this.googleAuthCacheKey, JSON.stringify({
        data: encryptedData,
        expiry: cacheExpiry,
      }));
      
      // Set a backup in sessionStorage for cross-browser compatibility
      try {
        sessionStorage.setItem('google_auth_cache_backup', JSON.stringify({
          email: googleAuthState.email,
          displayName: googleAuthState.displayName,
          photoURL: googleAuthState.photoURL,
        }));
      } catch (sessionError) {
        console.error('Error setting session storage backup:', sessionError);
      }
    } catch (error) {
      console.error('Error caching Google auth state:', error);
      // Try to clear cache if setting fails
      try {
        this.clearGoogleAuthCache();
      } catch (clearError) {
        // If even clearing fails, just log and continue
        console.error('Error clearing Google auth cache:', clearError);
      }
    }
  },

  /**
   * Get cached Google authentication state if available and valid
   * @returns {Object|null} The cached auth state or null if not found/expired
   */
  getGoogleAuthCache() {
    try {
      const cachedData = this._storage.getItem(this.googleAuthCacheKey);
      if (!cachedData) {
        // Try session storage backup
        try {
          const sessionBackup = sessionStorage.getItem('google_auth_cache_backup');
          if (sessionBackup) {
            return JSON.parse(sessionBackup);
          }
        } catch (sessionError) {
          console.error('Error retrieving session backup:', sessionError);
        }
        return null;
      }

      let cacheObj;
      try {
        cacheObj = JSON.parse(cachedData);
      } catch (parseError) {
        console.error('Error parsing cached data:', parseError);
        this.clearGoogleAuthCache();
        return null;
      }

      // Use optional chaining to check properties
      if (!cacheObj?.data || !cacheObj?.expiry) {
        this.clearGoogleAuthCache();
        return null;
      }

      if (Date.now() > cacheObj.expiry) {
        this.clearGoogleAuthCache();
        return null;
      }

      const deviceKey = this.getCurrentDeviceId();
      const decryptedData = this.simpleEncrypt(cacheObj.data, deviceKey);
      
      try {
        return JSON.parse(decryptedData);
      } catch (parseError) {
        console.error('Error parsing decrypted data:', parseError);
        this.clearGoogleAuthCache();
        return null;
      }
    } catch (error) {
      console.error('Error retrieving Google auth cache:', error);
      // Try to clear cache if retrieval fails
      try {
        this.clearGoogleAuthCache();
      } catch (clearError) {
        // If even clearing fails, just log and continue
        console.error('Error clearing Google auth cache after retrieval failure:', clearError);
      }
      return null;
    }
  },

  /**
   * Clear the Google authentication cache
   */
  clearGoogleAuthCache() {
    try {
      this._storage.removeItem(this.googleAuthCacheKey);
      
      // Clear session storage backup
      try {
        sessionStorage.removeItem('google_auth_cache_backup');
      } catch (sessionError) {
        console.error('Error clearing session storage backup:', sessionError);
      }
    } catch (error) {
      console.error('Error clearing Google auth cache:', error);
    }
  },

  /**
   * Set the last profile update timestamp
   * @param {string} uid - The user's ID
   * @param {Date} timestamp - The timestamp of the update (defaults to now)
   */
  setProfileUpdateTime(uid, timestamp = new Date()) {
    try {
      if (!uid) return;
      this._storage.setItem(`${this.profileUpdateTimeKey}_${uid}`, timestamp.getTime().toString());
    } catch (error) {
      console.error('Error setting profile update time:', error);
    }
  },

  /**
   * Get the last profile update timestamp
   * @param {string} uid - The user's ID
   * @returns {Date|null} The timestamp of the last update or null if not found
   */
  getProfileUpdateTime(uid) {
    try {
      if (!uid) return null;

      const timestampStr = this._storage.getItem(`${this.profileUpdateTimeKey}_${uid}`);
      if (!timestampStr) return null;

      const timestamp = parseInt(timestampStr, 10);
      return isNaN(timestamp) ? null : new Date(timestamp);
    } catch (error) {
      console.error('Error getting profile update time:', error);
      return null;
    }
  },

  /**
   * Check if profile can be updated (based on time restriction)
   * @param {string} uid - The user's ID
   * @param {number} minDays - Minimum days between updates (default: 1)
   * @returns {boolean} Whether the profile can be updated
   */
  canUpdateProfile(uid, minDays = 1) {
    try {
      if (!uid) return true;

      const lastUpdate = this.getProfileUpdateTime(uid);
      if (!lastUpdate) return true;

      const now = new Date();
      const daysSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastUpdate >= minDays;
    } catch (error) {
      console.error('Error checking if profile can be updated:', error);
      return true;
    }
  },

  /**
   * Clear all authentication-related data from local storage upon logout
   */
  clearAuth() {
    try {
      this._storage.removeItem(this.tokenKey);
      this._storage.removeItem(this.tokenExpiryKey);
      this._storage.removeItem(this.lastTokenSetTimeKey);
      this.clearGoogleAuthCache();
      
      // Clear backup cookies
      document.cookie = 'auth_token_backup=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'auth_uid_backup=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Also clear any session storage backups
      try {
        sessionStorage.removeItem('google_auth_cache_backup');
        sessionStorage.removeItem('auth_navigation_pending');
        sessionStorage.removeItem('auth_navigation_target');
        sessionStorage.removeItem('verification_redirect');
      } catch (sessionError) {
        console.error('Error clearing session storage items:', sessionError);
      }
      
      console.log('Authentication data cleared.');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
};

export default TokenService;