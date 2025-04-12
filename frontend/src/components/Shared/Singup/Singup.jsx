import React, { useState, useContext, useId, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import BrandLogo from '../Brandlogo/brandlogo';
import { ErrorMessage } from '../../common/ErrorMessage/ErrorMessage';
import { 
  validatePassword, 
  validateEmail, 
  validateConfirmPassword,
  PASSWORD_CONFIG,
} from './PasswordValidation';

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
  'auth/weak-password': `Password should be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`,
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/popup-closed-by-user': 'Google sign-up was cancelled. Please try again.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/invalid-credential': 'Invalid credentials provided.',
  'MAX_DEVICES_REACHED': 'You\'ve reached the maximum device limit. Please log out from another device to continue.'
};

const Signup = () => {
  const { createUser, signInWithGoogle, maxDevices, getGoogleAuthCache } = useContext(AuthContext);
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
  const [cachedGoogleAccount, setCachedGoogleAccount] = useState(null);
  
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const navigate = useNavigate();

  useEffect(() => {
    try {
      const cachedAuth = getGoogleAuthCache ? getGoogleAuthCache() : null;
      if (cachedAuth?.email) {
        setCachedGoogleAccount(cachedAuth);
      }
    } catch (error) {
      console.error("Error retrieving cached Google account:", error);
    }
  }, [getGoogleAuthCache]);

  useEffect(() => {
    if (showVerificationMessage) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showVerificationMessage, navigate]);

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  };

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  const debouncedValidation = useCallback(
    debounce((name, value) => {
      handleValidation(name, value);
    }, 300),
    []
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touchedFields[name]) {
      debouncedValidation(name, value);
    }
  };

  const handleValidation = (name, value) => {
    if (name === 'email') {
      validateEmailField(value);
    } else if (name === 'password') {
      validatePasswordField(value);
    } else if (name === 'confirmPassword') {
      validateConfirmPasswordField(value);
    }
  };

  const validateEmailField = (value) => {
    const emailError = validateEmail(value);
    if (emailError) {
      setError(emailError);
    } else {
      setError('');
    }
  };

  const validatePasswordField = (value) => {
    const passwordErrors = validatePassword(value);
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]);
    } else {
      setError('');
    }
  };

  const validateConfirmPasswordField = (value) => {
    const confirmError = validateConfirmPassword(formData.password, value);
    if (confirmError) {
      setError(confirmError);
    } else {
      setError('');
    }
  };

  const validateAllFields = () => {
    const emailError = validateEmail(formData.email);
    const passwordErrors = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('All fields are required');
      return false;
    }
    
    if (emailError) {
      setError(emailError);
      return false;
    }
    
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]);
      return false;
    }

    if (confirmPasswordError) {
      setError(confirmPasswordError);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateAllFields()) {
      return;
    }

    setLoading(true);
    try {
      await createUser(
        formData.email,
        formData.password,
        formData.firstName.trim(),
        formData.lastName.trim()
      );
      setShowVerificationMessage(true);
    } catch (err) {
      const errorCode = err.code || err.message;
      setError(AUTH_ERROR_MESSAGES[errorCode] || 'An error occurred during signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      const errorCode = err.code || err.message;
      if (errorCode === 'MAX_DEVICES_REACHED') {
        setError(`You've reached the maximum device limit (${maxDevices}). Please log out from another device to continue.`);
      } else {
        setError(AUTH_ERROR_MESSAGES[errorCode] || 'Failed to sign up with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="min-h-screen flex flex-col justify-center px-4 py-8 sm:py-12 bg-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Background elements */}
      <div className="absolute top-0 -left-32 w-[30rem] h-[30rem] bg-blue-600 opacity-15 rounded-full filter blur-[64px]" />
      <div className="absolute bottom-0 -right-32 w-[30rem] h-[30rem] bg-purple-500 opacity-15 rounded-full filter blur-[64px]" />
      
      <div className="w-full max-w-md mx-auto relative z-10">
        <BrandLogo className="justify-center mb-8" />
        <div className="relative bg-gray-800/80 backdrop-blur-md rounded-[28px] border border-gray-700 shadow-2xl ring-1 ring-blue-900/30 p-6 sm:p-8 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center text-white mb-2">
            Create Account
          </h2>

          <AnimatePresence mode="wait">
            {showVerificationMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-[14px] bg-green-800/30 border border-green-700"
              >
                <p className="text-green-400 text-sm text-center">
                  A verification email has been sent to your email address.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!showVerificationMessage && (
            <>
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label 
                      htmlFor={firstNameId} 
                      className="block text-sm font-medium text-gray-300"
                    >
                      First Name
                    </label>
                    <input
                      id={firstNameId}
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-[14px] shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label 
                      htmlFor={lastNameId} 
                      className="block text-sm font-medium text-gray-300"
                    >
                      Last Name
                    </label>
                    <input
                      id={lastNameId}
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-[14px] shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label 
                    htmlFor={emailId} 
                    className="block text-sm font-medium text-gray-300"
                  >
                    Email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-[14px] shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label 
                    htmlFor={passwordId} 
                    className="block text-sm font-medium text-gray-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-[14px] shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Must include uppercase, lowercase, number, and special character.
                  </p>
                </div>

                <div className="space-y-2">
                  <label 
                    htmlFor={confirmPasswordId} 
                    className="block text-sm font-medium text-gray-300"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id={confirmPasswordId}
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-[14px] shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {error && <ErrorMessage error={error} />}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="relative group w-full shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-[14px] shadow-md" />
                  <span className="absolute inset-0 w-full h-full bg-white/10 rounded-[14px] blur-[1px]" />
                  <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-[14px] transform transition-transform group-hover:scale-[1.02]" />
                  <span className="relative flex items-center justify-center text-white font-medium py-2.5 text-sm">
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </span>
                </motion.button>
              </form>

              <div className="relative my-5 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {cachedGoogleAccount ? (
                <div className="space-y-3">
                  <motion.button
                    onClick={handleGoogleSignup}
                    disabled={loading}
                    className="w-full flex items-center justify-center py-2.5 px-4 border border-blue-500 rounded-[14px] shadow-md text-sm font-medium text-white bg-blue-500/20 hover:bg-blue-500/30 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    {cachedGoogleAccount.photoURL ? (
                      <img 
                        src={cachedGoogleAccount.photoURL} 
                        alt="Profile" 
                        className="w-5 h-5 rounded-full mr-2" 
                      />
                    ) : (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 32 32" 
                        className="w-5 h-5 mr-2 fill-current"
                      >
                        <path d="M16.318 13.714v5.484h9.078c-0.37 2.354-2.745 6.901-9.078 6.901-5.458 0-9.917-4.521-9.917-10.099s4.458-10.099 9.917-10.099c3.109 0 5.193 1.318 6.38 2.464l4.339-4.182c-2.786-2.599-6.396-4.182-10.719-4.182-8.844 0-16 7.151-16 16s7.156 16 16 16c9.234 0 15.365-6.49 15.365-15.635 0-1.052-0.115-1.854-0.255-2.651z"></path>
                      </svg>
                    )}
                    Continue with {cachedGoogleAccount.displayName || cachedGoogleAccount.email}
                  </motion.button>
                  
                  <div className="text-center">
                    <button 
                      onClick={() => setCachedGoogleAccount(null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Use a different account
                    </button>
                  </div>
                </div>
              ) : (
                <motion.button
                  onClick={handleGoogleSignup}
                  disabled={loading}
                  className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-600 rounded-[14px] shadow-md text-sm font-medium text-white bg-gray-700/50 hover:bg-gray-700/70 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 32 32" 
                    className="w-5 h-5 mr-2 fill-current"
                  >
                    <path d="M16.318 13.714v5.484h9.078c-0.37 2.354-2.745 6.901-9.078 6.901-5.458 0-9.917-4.521-9.917-10.099s4.458-10.099 9.917-10.099c3.109 0 5.193 1.318 6.38 2.464l4.339-4.182c-2.786-2.599-6.396-4.182-10.719-4.182-8.844 0-16 7.151-16 16s7.156 16 16 16c9.234 0 15.365-6.49 15.365-15.635 0-1.052-0.115-1.854-0.255-2.651z"></path>
                  </svg>
                  Sign up with Google
                </motion.button>
              )}
            </>
          )}

          <p className="mt-5 sm:mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link 
              to="/login"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Signup;