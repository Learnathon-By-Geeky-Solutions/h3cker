import { useState, useContext, useCallback, useEffect } from 'react';
import { useNavigate} from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';

export const useGoogleAuth = () => {
  const { signInWithGoogle, maxDevices, getGoogleAuthCache, googleAuthChecked } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [cachedGoogleAccount, setCachedGoogleAccount] = useState(null);
  const navigate = useNavigate();

  // Load Google cached account when context is ready
  useEffect(() => {
    const loadCachedAccount = () => {
      try {
        if (typeof getGoogleAuthCache === 'function') {
          const cachedAuth = getGoogleAuthCache();
          if (cachedAuth?.email) {
            console.log("Found cached Google account, updating UI");
            setCachedGoogleAccount(cachedAuth);
          } else {
            console.log("No cached Google account found");
          }
        }
      } catch (error) {
        console.error("Error retrieving cached Google account:", error);
      }
    };

    // Load immediately if auth is already checked
    if (googleAuthChecked) {
      loadCachedAccount();
    }
    
    // Also set up an interval to periodically check for cache updates
    const intervalId = setInterval(loadCachedAccount, 3000);
    return () => clearInterval(intervalId);
  }, [getGoogleAuthCache, googleAuthChecked]);

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    setAuthError('');

    try {
      const user = await signInWithGoogle();
      if (user) {
        // Use direct navigation to home
        navigate('/', { replace: true });
      }
    } catch (error) {
      if (error.message === 'MAX_DEVICES_REACHED') {
        setAuthError(`You've reached the maximum device limit (${maxDevices}). Please log out from another device to continue.`);
      } else {
        setAuthError('Failed to sign in with Google');
        console.error('Google sign-in error:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, navigate, maxDevices]);

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
  
  const navigate = useNavigate();

  const handleLoginError = useCallback((error) => {
    if (error.message === 'EMAIL_NOT_VERIFIED') {
      setAuthError('Please verify your email before logging in');
    } else if (error.message === 'MAX_DEVICES_REACHED') {
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
      const user = await login(email, password);
      if (user) {
        // Use direct navigation to home
        navigate('/', { replace: true });
      }
    } catch (error) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  }, [login, email, password, navigate, handleLoginError]);

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
  
  const navigate = useNavigate();

  // Redirect to home after verification message
  useEffect(() => {
    if (showVerificationMessage) {
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showVerificationMessage, navigate]);

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
        formData.email,
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