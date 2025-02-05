import React, { createContext, useState, useEffect, useMemo } from 'react';
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
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Spinner } from 'flowbite-react';
import PropTypes from 'prop-types';

export const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();

// Default avatar from Flowbite
const DEFAULT_AVATAR = 'https://flowbite.com/docs/images/people/profile-picture-5.jpg';

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      emailVerified: false
    });

    return userCredential.user;
  };

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    await setDoc(doc(db, "users", userCredential.user.uid), {
      lastLoginAt: serverTimestamp()
    }, { merge: true });

    return userCredential.user;
  };

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const userDocRef = doc(db, "users", result.user.uid);
    const userSnapshot = await getDoc(userDocRef);

    if (!userSnapshot.exists()) {
      const nameParts = result.user.displayName?.split(" ") || ['User'];
      await setDoc(userDocRef, {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || '',
        email: result.user.email,
        photoURL: result.user.photoURL || DEFAULT_AVATAR,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        role: 'user',
        emailVerified: result.user.emailVerified
      });
    } else {
      await setDoc(userDocRef, { 
        lastLoginAt: serverTimestamp(),
        emailVerified: result.user.emailVerified
      }, { merge: true });
    }

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

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          setUser({ ...currentUser, ...userDoc.data() });
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    createUser,
    login,
    logout,
    signInWithGoogle,
    linkAccounts,
    resetPassword,
    resendVerificationEmail
  }), [user, loading]);

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