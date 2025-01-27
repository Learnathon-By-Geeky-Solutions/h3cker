import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../../firebase/firebase.config';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile,
 
} from 'firebase/auth';

export const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();

const AuthProvider = ({ children }) => {

  const createUser = async (email, password, firstName, lastName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    await updateProfile(userCredential.user, {
      displayName: `${firstName} ${lastName}`,
      photoURL: "https://i.ibb.co/yWjpDXh/image.png"
    });

    return userCredential.user;
  };


  const value = {};

  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;