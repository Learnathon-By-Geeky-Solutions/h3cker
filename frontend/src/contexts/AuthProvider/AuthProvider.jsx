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
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import PropTypes from 'prop-types';
import TokenService from '../../utils/TokenService';

export const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();

const DEFAULT_AVATAR = 'https://flowbite.com/docs/images/people/profile-picture-5.jpg';

// Helper function to handle user updates in Firestore
const updateUserData = async (uid, updates) => {
  try {
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, updates);
    return true;
  } catch (error) {
    console.error('Error updating user data:', error);
    return false;
  }
};

// Helper function to process user data after authentication
const processAuthenticatedUser = async (userCredential, deviceId) => {
  const token = await userCredential.user.getIdToken();
  TokenService.setToken(token, userCredential.user.uid);
  return userCredential.user;
};

// Helper function to check pending navigations
const checkPendingNavigations = (currentUser) => {
  // Check for pending navigation in sessionStorage
  const pendingNavigation = sessionStorage.getItem('auth_navigation_pending');
  if (pendingNavigation === 'true') {
    sessionStorage.removeItem('auth_navigation_pending');
    
    const authPaths = ['/login', '/signup', '/forgetpassword'];
    const currentPath = window.location.pathname;
    
    // If user is authenticated but still on an auth page, redirect to home
    if (authPaths.some(path => currentPath.includes(path))) {
      const targetPath = sessionStorage.getItem('auth_navigation_target') || '/';
      sessionStorage.removeItem('auth_navigation_target');
      
      console.log('Auth state changed, forcing navigation from auth page');
      window.location.href = targetPath;
    }
  }
  
  // Handle verification redirects
  const verificationRedirect = sessionStorage.getItem('verification_redirect');
  if (verificationRedirect === 'true') {
    sessionStorage.removeItem('verification_redirect');
    
    // If we've just verified and need to redirect
    if (currentUser.emailVerified) {
      console.log('Email verified, redirecting to home');
      window.location.href = '/';
    }
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceError] = useState(null);
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(null);
  const [googleAuthChecked, setGoogleAuthChecked] = useState(false);

  const updateUserDevices = async (uid, deviceId, isNewUser = false) => {
    const userDocRef = doc(db, "users", uid);
    
    if (isNewUser) {
      return [{
        id: deviceId,
        name: TokenService.getDeviceName(),
        lastActive: new Date().toISOString()
      }];
    }
    
    const userSnapshot = await getDoc(userDocRef);
    if (!userSnapshot.exists()) {
      return [{
        id: deviceId,
        name: TokenService.getDeviceName(),
        lastActive: new Date().toISOString()
      }];
    }
    
    const userData = userSnapshot.data();
    const userDevices = userData.devices || [];
    
    const isExistingDevice = userDevices.some(device => device.id === deviceId);
    
    if (!isExistingDevice && userDevices.length >= TokenService.maxDevices) {
      throw new Error('MAX_DEVICES_REACHED');
    }
    
    if (isExistingDevice) {
      return userDevices.map(device => 
        device.id === deviceId 
          ? { ...device, lastActive: new Date().toISOString() }
          : device
      );
    } else {
      return [
        ...userDevices,
        {
          id: deviceId,
          name: TokenService.getDeviceName(),
          lastActive: new Date().toISOString()
        }
      ];
    }
  };

  const createUser = async (email, password, firstName, lastName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await sendEmailVerification(userCredential.user);
    
    await updateProfile(userCredential.user, {
      displayName: `${firstName} ${lastName}`,
      photoURL: DEFAULT_AVATAR
    });

    const deviceId = TokenService.getCurrentDeviceId();
    const devices = await updateUserDevices(userCredential.user.uid, deviceId, true);

    await setDoc(doc(db, "users", userCredential.user.uid), {
      firstName,
      lastName,
      email,
      photoURL: DEFAULT_AVATAR,
      createdAt: serverTimestamp(),
      role: 'user',
      emailVerified: userCredential.user.emailVerified,
      devices
    });

    return processAuthenticatedUser(userCredential, deviceId);
  };

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    const deviceId = TokenService.getCurrentDeviceId();
    
    const updatedDevices = await updateUserDevices(userCredential.user.uid, deviceId);
    
    await updateUserData(userCredential.user.uid, {
      lastLoginAt: serverTimestamp(),
      devices: updatedDevices,
      emailVerified: userCredential.user.emailVerified
    });

    return processAuthenticatedUser(userCredential, deviceId);
  };

  // Handle Google sign-in process
  const handleGoogleSignIn = async (result) => {
    const deviceId = TokenService.getCurrentDeviceId();
    const userDocRef = doc(db, "users", result.user.uid);
    const userSnapshot = await getDoc(userDocRef);

    if (!userSnapshot.exists()) {
      // Create new user document
      await createGoogleUserDocument(result, deviceId);
    } else {
      // Update existing user document
      await updateGoogleUserDocument(result, deviceId);
    }

    // Set token and cache
    const token = await result.user.getIdToken();
    TokenService.setToken(token, result.user.uid);
    
    TokenService.setGoogleAuthCache({
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL
    }, result.user.uid);

    return result.user;
  };

  // Create new Google user document
  const createGoogleUserDocument = async (result, deviceId) => {
    const nameParts = result.user.displayName?.split(" ") || ['User'];
    
    await setDoc(doc(db, "users", result.user.uid), {
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
  };

  // Update existing Google user document
  const updateGoogleUserDocument = async (result, deviceId) => {
    const updatedDevices = await updateUserDevices(result.user.uid, deviceId);
    
    await updateDoc(doc(db, "users", result.user.uid), { 
      lastLoginAt: serverTimestamp(),
      emailVerified: result.user.emailVerified,
      devices: updatedDevices
    });
  };

  const signInWithGoogle = async () => {
    try {
      const cachedAuth = TokenService.getGoogleAuthCache();
      
      if (cachedAuth?.email) {
        console.log(`Signing in with previously used Google account: ${cachedAuth.email}`);
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      return await handleGoogleSignIn(result);
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-disabled') {
        TokenService.clearGoogleAuthCache();
      }
      throw error;
    }
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
      if (user) {
        console.log('Session expired, logging out');
        logout();
      }
      return false;
    }
    
    const timeRemaining = TokenService.getTimeUntilExpiry();
    setSessionTimeRemaining(timeRemaining);
    
    if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 0) {
      setSessionExpiring(true);
    } else {
      setSessionExpiring(false);
    }
    
    return true;
  }, [user]);

  const extendSession = useCallback(async () => {
    if (user) {
      try {
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

  const logout = async () => {
    setSessionExpiring(false);
    setSessionTimeRemaining(null);
    TokenService.clearAuth();
    return signOut(auth);
  };

  const removeDevice = async (deviceId) => {
    if (!user?.uid) return false;
    
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

  // Check for Google auth cache
  useEffect(() => {
    const checkGoogleAuthCache = async () => {
      try {
        const cachedAuth = TokenService.getGoogleAuthCache();
        if (cachedAuth?.email) {
          console.log(`Found cached Google account: ${cachedAuth.email}`);
        }
      } catch (error) {
        console.error("Error checking Google auth cache:", error);
        TokenService.clearGoogleAuthCache();
      } finally {
        setGoogleAuthChecked(true);
      }
    };
    
    checkGoogleAuthCache();
  }, []);

  // Session check for logged in user
  useEffect(() => {
    if (!user) return undefined;
    
    checkSession();
    
    const intervalId = setInterval(() => {
      checkSession();
    }, 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [user, checkSession]);

  // Main auth state listener
  useEffect(() => {
    const handleAuthStateChange = async (currentUser) => {
      try {
        if (currentUser) {
          await processAuthenticatedUser({ user: currentUser });
          const userData = await getUserDataFromFirestore(currentUser);
          
          setUser({ 
            ...currentUser, 
            ...userData,
            emailVerified: currentUser.emailVerified 
          });
          
          checkSession();
          checkPendingNavigations(currentUser);
        } else {
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
    };

    const getUserDataFromFirestore = async (currentUser) => {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      
      // Set Google auth cache if applicable
      if (currentUser.providerData.some(provider => provider.providerId === 'google.com')) {
        TokenService.setGoogleAuthCache({
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL
        }, currentUser.uid);
      }
      
      // Update emailVerified status if needed
      const userData = userDoc.exists() ? userDoc.data() : {};
      if (userDoc.exists() && userData.emailVerified !== currentUser.emailVerified) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          emailVerified: currentUser.emailVerified
        });
      }
      
      return userData;
    };
    
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
    return () => unsubscribe();
  }, [checkSession]);
  
  // Force check on initial load
  useEffect(() => {
    // Force a check on initial load
    const checkCurrentAuthState = async () => {
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken(true);
          TokenService.setToken(token, auth.currentUser.uid);
        } catch (error) {
          console.error('Error refreshing token on initial load:', error);
        }
      }
    };
    
    checkCurrentAuthState();
    
    // Handle browser back button
    const handleBackNavigation = () => {
      if (auth.currentUser) {
        const authPaths = ['/login', '/signup', '/forgetpassword'];
        const currentPath = window.location.pathname;
        
        if (authPaths.some(path => currentPath.includes(path))) {
          console.log('Detected back navigation to auth page while logged in');
          window.location.replace('/');
        }
      }
    };
    
    window.addEventListener('popstate', handleBackNavigation);
    
    return () => {
      window.removeEventListener('popstate', handleBackNavigation);
    };
  }, []);
 
  const safeGetGoogleAuthCache = useCallback(() => {
    try {
      return TokenService.getGoogleAuthCache();
    } catch (error) {
      console.error("Error getting Google auth cache:", error);
      return null;
    }
  }, []);

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
    sessionExpiring,
    sessionTimeRemaining,
    extendSession,
    checkSession,
    googleAuthChecked,
    getGoogleAuthCache: safeGetGoogleAuthCache 
  }), [user, loading, deviceError, sessionExpiring, sessionTimeRemaining, extendSession, checkSession, googleAuthChecked, safeGetGoogleAuthCache]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;