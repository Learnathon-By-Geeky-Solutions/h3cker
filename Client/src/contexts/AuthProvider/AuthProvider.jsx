import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from "../../firebase/firebase.config";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile,
  linkWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'; // Added updateDoc
import { Spinner } from 'flowbite-react';
import PropTypes from 'prop-types';
import TokenService from '../../utils/TokenService';

export const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();

// Default avatar from Flowbite
const DEFAULT_AVATAR = 'https://flowbite.com/docs/images/people/profile-picture-5.jpg';

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceError] = useState(null); // Added for device limit errors
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(null);

  const createUser = async (email, password, firstName, lastName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await sendEmailVerification(userCredential.user);
    
    await updateProfile(userCredential.user, {
      displayName: `${firstName} ${lastName}`,
      photoURL: DEFAULT_AVATAR
    });

    await setDoc(doc(db, "users", userCredential.user.uid), {
      firstName,
      lastName,
      email,
      photoURL: DEFAULT_AVATAR,
      createdAt: serverTimestamp(),
      role: 'user',
      emailVerified: false,
      // Added device tracking
      devices: [{
        id: TokenService.getCurrentDeviceId(),
        name: TokenService.getDeviceName(),
        lastActive: new Date().toISOString()
      }]
    });

    // Set auth token
    const token = await userCredential.user.getIdToken();
    TokenService.setToken(token, userCredential.user.uid);

    return userCredential.user;
  };

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    // Get user document to check devices
    const userDocRef = doc(db, "users", userCredential.user.uid);
    const userSnapshot = await getDoc(userDocRef);
    const userData = userSnapshot.data() || {};
    
    // Get current device ID
    const deviceId = TokenService.getCurrentDeviceId();
    
    // Check if this device is already registered
    const userDevices = userData.devices || [];
    const isExistingDevice = userDevices.some(device => device.id === deviceId);
    
    // If this is a new device and would exceed the limit, throw error
    if (!isExistingDevice && userDevices.length >= TokenService.maxDevices) {
      await signOut(auth);
      throw new Error('MAX_DEVICES_REACHED');
    }
    
    // Update or add this device
    let updatedDevices;
    if (isExistingDevice) {
      updatedDevices = userDevices.map(device => 
        device.id === deviceId 
          ? { ...device, lastActive: new Date().toISOString() }
          : device
      );
    } else {
      updatedDevices = [
        ...userDevices,
        {
          id: deviceId,
          name: TokenService.getDeviceName(),
          lastActive: new Date().toISOString()
        }
      ];
    }

    // Update user document
    await updateDoc(userDocRef, {
      lastLoginAt: serverTimestamp(),
      devices: updatedDevices
    });

    // Get and store token
    const token = await userCredential.user.getIdToken();
    TokenService.setToken(token, userCredential.user.uid);

    return userCredential.user;
  };

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const userDocRef = doc(db, "users", result.user.uid);
    const userSnapshot = await getDoc(userDocRef);

    // Get current device ID
    const deviceId = TokenService.getCurrentDeviceId();
    
    if (!userSnapshot.exists()) {
      const nameParts = result.user.displayName?.split(" ") || ['User'];
      
      // First time user - create new document with this device
      await setDoc(userDocRef, {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || '',
        email: result.user.email,
        photoURL: result.user.photoURL || DEFAULT_AVATAR,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        role: 'user',
        emailVerified: result.user.emailVerified,
        devices: [{
          id: deviceId,
          name: TokenService.getDeviceName(),
          lastActive: new Date().toISOString()
        }]
      });
    } else {
      // Existing user - update devices
      const userData = userSnapshot.data();
      const userDevices = userData.devices || [];
      
      // Check if this device is already registered
      const isExistingDevice = userDevices.some(device => device.id === deviceId);
      
      // If this is a new device and would exceed the limit, throw error
      if (!isExistingDevice && userDevices.length >= TokenService.maxDevices) {
        await signOut(auth);
        throw new Error('MAX_DEVICES_REACHED');
      }
      
      // Update or add this device
      let updatedDevices;
      if (isExistingDevice) {
        updatedDevices = userDevices.map(device => 
          device.id === deviceId 
            ? { ...device, lastActive: new Date().toISOString() }
            : device
        );
      } else {
        updatedDevices = [
          ...userDevices,
          {
            id: deviceId,
            name: TokenService.getDeviceName(),
            lastActive: new Date().toISOString()
          }
        ];
      }
      
      await updateDoc(userDocRef, { 
        lastLoginAt: serverTimestamp(),
        emailVerified: result.user.emailVerified,
        devices: updatedDevices
      });
    }

    // Get and store token
    const token = await result.user.getIdToken();
    TokenService.setToken(token, result.user.uid);

    return result.user;
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const linkAccounts = async (email, password) => {
    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(auth.currentUser, credential);
  };
  const checkSession = useCallback(() => {
    if (TokenService.isTokenExpired()) {
      // Token is expired, log the user out
      if (user) {
        console.log('Session expired, logging out');
        logout();
      }
      return false;
    }
    
    // Get remaining time
    const timeRemaining = TokenService.getTimeUntilExpiry();
    setSessionTimeRemaining(timeRemaining);
    
    // Show warning when less than 5 minutes remaining
    if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 0) {
      setSessionExpiring(true);
    } else {
      setSessionExpiring(false);
    }
    
    return true;
  }, [user]);

  // Extend the session
  const extendSession = useCallback(async () => {
    if (user) {
      try {
        // Get a fresh token from Firebase
        const token = await user.getIdToken(true);
        TokenService.setToken(token, user.uid);
        setSessionExpiring(false);
        checkSession();
        return true;
      } catch (error) {
        console.error("Failed to extend session:", error);
        return false;
      }
    }
    return false;
  }, [user, checkSession]);

  // Updated logout to clear token
  const logout = async () => {
    setSessionExpiring(false);
    setSessionTimeRemaining(null);
    TokenService.clearAuth();
    return signOut(auth);
  };
    // Add a session check interval
    useEffect(() => {
      if (!user) return;
      
      // Check session immediately
      checkSession();
      
      // Set up periodic checks (every minute)
      const intervalId = setInterval(() => {
        checkSession();
      }, 60 * 1000);
      
      return () => clearInterval(intervalId);
    }, [user, checkSession]);
  

  // Remove device from user's devices list
  const removeDevice = async (deviceId) => {
    if (!user?.uid) return;
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const updatedDevices = (userData.devices || [])
          .filter(device => device.id !== deviceId);
        
        await updateDoc(userDocRef, {
          devices: updatedDevices
        });
        
        // If current device was removed, also log out
        if (deviceId === TokenService.getCurrentDeviceId()) {
          await logout();
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error removing device:", error);
      return false;
    }
  };

  // Get user's devices
  const getUserDevices = async () => {
    if (!user?.uid) return [];
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        return userData.devices || [];
      }
      return [];
    } catch (error) {
      console.error("Error getting devices:", error);
      return [];
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          
          // Get updated token on each auth state change
          const token = await currentUser.getIdToken();
          TokenService.setToken(token, currentUser.uid);
          
          setUser({ ...currentUser, ...userDoc.data() });
          // Check session after setting user
          checkSession();
        } else {
          // Clear auth when user is null
          TokenService.clearAuth();
          setUser(null);
          setSessionExpiring(false);
          setSessionTimeRemaining(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        TokenService.clearAuth();
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [checkSession]);
 
  const value = useMemo(() => ({
    user,
    loading,
    deviceError,
    createUser,
    login,
    logout,
    signInWithGoogle,
    linkAccounts,
    resetPassword,
    resendVerificationEmail,
    removeDevice,
    getUserDevices,
    maxDevices: TokenService.maxDevices,
    // New session-related values
    sessionExpiring,
    sessionTimeRemaining,
    extendSession,
    checkSession
  }), [user, loading, deviceError, sessionExpiring, sessionTimeRemaining, extendSession, checkSession]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;