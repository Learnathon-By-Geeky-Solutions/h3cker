const TokenService = {
  tokenKey: 'auth_token',
  userDevicesKey: 'user_devices',
  currentDeviceKey: 'current_device_id',
  tokenExpiryKey: 'auth_token_expiry',
  googleAuthCacheKey: 'google_auth_cache',
  profileUpdateTimeKey: 'profile_last_update_time',
  lastTokenSetTimeKey: 'last_token_set_time',

  sessionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds 
  tokenRateLimitMs: 1000, //1sec

  maxDevices: 3,

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
   * Simple hash function (non-cryptographic)
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    if (!str || str.length === 0) return hash.toString(36);

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; 
    }

    return Math.abs(hash).toString(36);
  },

  /**
   * Gathers performance data string for fallback ID generation
   * @private
   */
  _getPerformanceDataString() {
    const timestamp = Date.now().toString(36);
    let perfData = '';
    try {
      if (typeof performance !== 'undefined' && performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
          const navigationTiming = navigationEntries[0];
          const timingData = navigationTiming.toJSON ? navigationTiming.toJSON() : navigationTiming;
  
          perfData = Object.values(timingData)
                           .filter(v => typeof v === 'number' && !isNaN(v))
                           .join('');
        } else if (performance.now) {
          perfData = performance.now().toString();
        }
      } else if (typeof performance !== 'undefined' && performance.now) {
        perfData = performance.now().toString();
      }
    } catch (e) {
      console.warn('Could not access performance timing data:', e);
      perfData = timestamp.split('').reverse().join('');
    }
  
    return perfData || timestamp;
  },

  /**
   * Generates a device ID using fallback methods when crypto is unavailable
   * @private
   */
  _generateFallbackDeviceId() {
    console.warn('Crypto API not available, generating fallback device ID.');
    const timestamp = Date.now().toString(36);

    const timeStr = new Date().toISOString();
    const navStr = typeof navigator !== 'undefined' ?
                  `${navigator.userAgent || ''}${navigator.language || ''}${navigator.hardwareConcurrency || ''}` :
                  'fallback-nav';
    const d = new Date();
    const timeComponents = [
      d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()
    ].join('-');

    const perfData = this._getPerformanceDataString();

    const part1 = this._simpleHash(timeStr + navStr);
    const part2 = this._simpleHash(timeComponents + perfData + timestamp);

    return `${timestamp}-${part1}-${part2}`;
  },

  /**
   * Generate a unique device ID with best available browser crypto methods
   * @returns {string} A unique device identifier
   */
  generateDeviceId() {
    try {
      // Use crypto API if available
      if (window.crypto?.getRandomValues) {
        const buffer = new Uint8Array(8);
        window.crypto.getRandomValues(buffer);
        const randomHex = Array.from(buffer)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        const timestamp = Date.now().toString(36);
        return `${timestamp}-${randomHex}`;
      }

      return this._generateFallbackDeviceId();
    } catch (error) {
      console.error('Error generating device ID:', error);
      return this._generateFallbackDeviceId();
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
   * Detect platform name from user agent
   * @private
   * @returns {string} The detected platform name
   */
  _detectPlatform() {
    try {
      if (navigator.userAgentData?.platform) {
        return navigator.userAgentData.platform;
      }
      
      const userAgent = navigator.userAgent;
      if (userAgent.includes('Win')) return 'Windows';
      if (userAgent.includes('Mac')) return 'macOS';
      if (userAgent.includes('Linux')) return 'Linux';
      if (userAgent.includes('Android')) return 'Android';
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
      
      return 'Unknown Device';
    } catch (error) {
      console.error('Error detecting platform:', error);
      return 'Unknown Device';
    }
  },

  /**
   * Detect browser name from user agent
   * @private
   * @returns {string} The detected browser name
   */
  _detectBrowser() {
    try {
      const userAgent = navigator.userAgent;
      
      if (userAgent.indexOf("Edg") > -1) return "Edge";
      if (userAgent.indexOf("Chrome") > -1 && 
          userAgent.indexOf("Safari") > -1 && 
          userAgent.indexOf("OPR") === -1) return "Chrome";
      if (userAgent.indexOf("Firefox") > -1) return "Firefox";
      if (userAgent.indexOf("Safari") > -1 && 
          userAgent.indexOf("Chrome") === -1) return "Safari";
      if (userAgent.indexOf("OPR") > -1 || 
          userAgent.indexOf("Opera") > -1) return "Opera";
      if (userAgent.indexOf("Trident") > -1 || 
          userAgent.indexOf("MSIE") > -1) return "Internet Explorer";
      
      return "Unknown Browser";
    } catch (error) {
      console.error('Error detecting browser:', error);
      return 'Unknown Browser';
    }
  },

  /**
   * Get a friendly name for the current device
   * @returns {string} A name for the current device
   */
  getDeviceName() {
    try {
      const platform = this._detectPlatform();
      const browser = this._detectBrowser();
      
      return `${browser} on ${platform}`;
    } catch (error) {
      console.error('Error getting device name:', error);
      return 'Unknown Device';
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

      if (this.isRateLimited()) {
        console.debug("Token set rate limited. Skipping redundant token update.");
        return;
      }

      const currentToken = this.getToken();
      if (currentToken === token) {
        console.debug("Token unchanged. Skipping redundant update.");
        return;
      }

      this._storage.setItem(this.tokenKey, token);
      const expiryTime = Date.now() + this.sessionDuration;
      this._storage.setItem(this.tokenExpiryKey, expiryTime.toString());

      this.updateLastTokenSetTime();
      
      console.log(`Token set. Expires at: ${new Date(expiryTime).toLocaleString()}`);

      this.handleDeviceTracking(uid);
    } catch (error) {
      console.error('Error setting token:', error);
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
      if (this.isRateLimited()) return false;

      const expiryTime = Date.now() + this.sessionDuration;
      this._storage.setItem(this.tokenExpiryKey, expiryTime.toString());
      this.updateLastTokenSetTime();
      
      console.log(`Token expiry refreshed. New expiry: ${new Date(expiryTime).toLocaleString()}`);
      return true;
    } catch (error) {
      console.error('Error refreshing expiry:', error);
      return false;
    }
  },

  /**
   * Encrypt/decrypt data with a secure XOR-based transformation
   * @param {string} text 
   * @param {string} key
   * @returns {string} 
   * @private
   */
  simpleEncrypt(text, key) {
    try {
      if (!key || !text) return text;

      const expandKey = (baseKey) => {
        let expandedKey = '';
        let lastChar = 0;
        
        for (let i = 0; i < baseKey.length * 3; i++) {
          const charIndex = i % baseKey.length;
          const charCode = baseKey.charCodeAt(charIndex);

          const newCharCode = (charCode + i + lastChar) % 256;
          expandedKey += String.fromCharCode(newCharCode);
          lastChar = newCharCode;
        }
        
        return expandedKey;
      };
      
      const extendedKey = expandKey(key);

      let result = '';
      for (let i = 0; i < text.length; i++) {
        const keyIndex1 = i % extendedKey.length;
        const keyIndex2 = (i * 3) % extendedKey.length;
        
        const charCode = text.charCodeAt(i);
        const keyChar1 = extendedKey.charCodeAt(keyIndex1);
        const keyChar2 = extendedKey.charCodeAt(keyIndex2);

        const transformed = charCode ^ keyChar1 ^ keyChar2;
        result += String.fromCharCode(transformed);
      }
      
      return result;
    } catch (error) {
      console.error('Error during encryption/decryption:', error);
      return text;
    }
  },

  /**
   * Store Google authentication state securely for faster login hints
   * @param {Object} googleAuthState 
   * @param {string} uid 
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
  
      try {
        this.clearGoogleAuthCache();
      } catch (clearError) {
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

      try {
        this.clearGoogleAuthCache();
      } catch (clearError) {
        console.error('Error clearing Google auth cache after retrieval failure:', clearError);
      }
      return null;
    }
  },

  clearGoogleAuthCache() {
    try {
      this._storage.removeItem(this.googleAuthCacheKey);

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
   * @param {string} uid 
   * @param {Date} timestamp 
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
   * @param {string} uid 
   * @returns {Date|null} 
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
   * @param {string} uid 
   * @param {number} minDays 
   * @returns {boolean} 
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

  clearAuth() {
    try {
      this._storage.removeItem(this.tokenKey);
      this._storage.removeItem(this.tokenExpiryKey);
      this._storage.removeItem(this.lastTokenSetTimeKey);
      this.clearGoogleAuthCache();
      
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