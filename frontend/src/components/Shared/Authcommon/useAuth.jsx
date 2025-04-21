import { useState, useContext, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';

const useAuthNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navigateAfterAuth = useCallback((user) => {
    if (!user) return false;
    
    try {
      const from = location.state?.from?.pathname || '/';

      sessionStorage.setItem('auth_navigation_pending', 'true');
      sessionStorage.setItem('auth_navigation_target', from);
      
      // Edge browser detection
      const isEdge = navigator.userAgent.indexOf("Edg") > -1;
      
      if (isEdge) {
        console.log('Edge browser detected, using direct navigation');
        window.location.href = from;
        return true;
      }
      
      navigate(from, { replace: true });
      
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/login') || 
            currentPath.includes('/signup') || 
            currentPath.includes('/forgetpassword')) {
          
          console.log('Router navigation may have failed, using direct navigation');
          window.location.href = from;
        }
      }, 200); 
      
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = '/';
      return false;
    }
  }, [navigate, location]);
  
  return { navigateAfterAuth };
};

export const useGoogleAuth = () => {
  const { signInWithGoogle, maxDevices, getGoogleAuthCache, googleAuthChecked } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [cachedGoogleAccount, setCachedGoogleAccount] = useState(null);
  const { navigateAfterAuth } = useAuthNavigation();

  useEffect(() => {
    const loadCachedAccount = () => {
      try {
        if (typeof getGoogleAuthCache === 'function') {
          const cachedAuth = getGoogleAuthCache();
          if (cachedAuth?.email) {
            console.log("Found cached Google account, updating UI");
            setCachedGoogleAccount(cachedAuth);
          }
        }
      } catch (error) {
        console.error("Error retrieving cached Google account:", error);
      }
    };

    if (googleAuthChecked) {
      loadCachedAccount();
    }
    
    const initialLoadTimeout = setTimeout(loadCachedAccount, 500);
    
    const intervalId = setInterval(loadCachedAccount, 5000);
    
    return () => {
      clearTimeout(initialLoadTimeout);
      clearInterval(intervalId);
    };
  }, [getGoogleAuthCache, googleAuthChecked]);

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    setAuthError('');

    try {
      sessionStorage.removeItem('auth_navigation_pending');
      
      const user = await signInWithGoogle();
      if (user) {
        navigateAfterAuth(user);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      if (error.message === 'MAX_DEVICES_REACHED' || error.code === 'MAX_DEVICES_REACHED') {
        setAuthError(`You've reached the maximum device limit (${maxDevices}). Please log out from another device to continue.`);
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in canceled. Please try again.');
      } else {
        setAuthError('Failed to sign in with Google. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, navigateAfterAuth, maxDevices]);

  return { 
    loading, 
    authError, 
    cachedGoogleAccount, 
    setCachedGoogleAccount, 
    handleGoogleLogin 
  };
};

export const useLoginForm = () => {
  const { login, maxDevices } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const { navigateAfterAuth } = useAuthNavigation();

  const handleLoginError = useCallback((error) => {
    if (error.message === 'EMAIL_NOT_VERIFIED') {
      setAuthError('Please verify your email before logging in');
    } else if (error.message === 'MAX_DEVICES_REACHED' || error.code === 'MAX_DEVICES_REACHED') {
      setAuthError(`You've reached the maximum device limit (${maxDevices}). Please log out from another device to continue.`);
    } else {
      setAuthError('Invalid email or password');
      console.error('Login error:', error);
    }
  }, [maxDevices]);

  const handleEmailLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      // Clear any pending navigation flags
      sessionStorage.removeItem('auth_navigation_pending');
    
      if (!email || !password) {
        setAuthError('Please enter both email and password');
        setLoading(false);
        return;
      }
      
      const user = await login(email.trim(), password);
      if (user) {
        navigateAfterAuth(user);
      }
    } catch (error) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  }, [login, email, password, navigateAfterAuth, handleLoginError]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    loading,
    authError,
    handleEmailLogin
  };
};

export const useSignupForm = () => {
  const { createUser, maxDevices } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});


  useEffect(() => {
    if (showVerificationMessage) {
      sessionStorage.setItem('verification_redirect', 'true');
      
      const timer = setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showVerificationMessage]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const getAuthErrorMessage = useCallback((errorCode) => {
    switch(errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/weak-password':
        return 'Password does not meet security requirements';
      case 'MAX_DEVICES_REACHED':
        return `You've reached the maximum device limit (${maxDevices}). Please log out from another device to continue.`;
      default:
        return 'An error occurred during signup. Please try again.';
    }
  }, [maxDevices]);

  const handleSubmit = useCallback(async (e, validateFn) => {
    e.preventDefault();
    setError('');
    
    if (!validateFn()) {
      return;
    }

    setLoading(true);
    try {
      const user = await createUser(
        formData.email.trim(),
        formData.password,
        formData.firstName.trim(),
        formData.lastName.trim()
      );
      
      if (user) {
        setShowVerificationMessage(true);
      }
    } catch (err) {
      const errorCode = err.code || err.message;
      setError(getAuthErrorMessage(errorCode));
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  }, [createUser, formData, getAuthErrorMessage]);

  return {
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    error,
    setError,
    loading,
    showVerificationMessage,
    touchedFields,
    handleBlur,
    handleChange,
    handleSubmit
  };
};