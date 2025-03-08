import React, { useState, useContext, useId, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import BrandLogo from '../Brandlogo/brandlogo';
import { ErrorMessage } from '../../common/ErrorMessage';


const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/popup-closed-by-user': 'Google sign-up was cancelled. Please try again.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/invalid-credential': 'Invalid credentials provided.',
  'MAX_DEVICES_REACHED': 'You\'ve reached the maximum device limit. Please log out from another device to continue.'
};

// Defining minimum requirements to match Firebase's requirement
const MIN_PASSWORD_LENGTH = 6;

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

  // Check for cached Google account on component mount
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

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return ['Password is required'];
    
    // First check for minimum length to match Firebase's requirement
    if (password.length < MIN_PASSWORD_LENGTH) {
      return [ERROR_MESSAGES['auth/weak-password']];
    }
    
    // Additional requirements for UX but not blocking submission
    const suggestions = [];
    if (!/[A-Z]/.test(password)) suggestions.push('Consider adding an uppercase letter');
    if (!/[a-z]/.test(password)) suggestions.push('Consider adding a lowercase letter');
    if (!/\d/.test(password)) suggestions.push('Consider adding a number');
    if (!/[!@#$%^&*]/.test(password)) suggestions.push('Consider adding a special character (!@#$%^&*)');
    
    return suggestions;
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  };

  // Custom debounce implementation
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

  // Memoize the debounced function to keep a consistent reference
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
    if (passwordErrors.length > 0 && passwordErrors[0] === ERROR_MESSAGES['auth/weak-password']) {
      // Only show blocking error (minimum length)
      setError(passwordErrors[0]);
    } else {
      setError('');
    }
  };

  const validateConfirmPasswordField = (value) => {
    if (value !== formData.password) {
      setError('Passwords do not match');
    } else {
      setError('');
    }
  };

  const validateAllFields = () => {
    const emailError = validateEmail(formData.email);
    const passwordErrors = validatePassword(formData.password);
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('All fields are required');
      return false;
    }
    
    if (emailError) {
      setError(emailError);
      return false;
    }
    
    // Only block submission if it's the minimum length error
    if (passwordErrors.length > 0 && passwordErrors[0] === ERROR_MESSAGES['auth/weak-password']) {
      setError(passwordErrors[0]);
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate all fields before submission
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
      setError(ERROR_MESSAGES[errorCode] || 'An error occurred during signup. Please try again.');
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
        setError(ERROR_MESSAGES[errorCode] || 'Failed to sign up with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="min-h-screen flex flex-col justify-center px-4 py-8 sm:py-12 bg-gradient-to-br from-blue-50 to-indigo-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="w-full max-w-md mx-auto">
        <BrandLogo className="justify-center mb-8" />
        <div className="relative bg-white bg-opacity-90 sm:backdrop-blur-md rounded-xl border border-white/40 shadow-2xl ring-2 ring-blue-100/50 p-4 sm:p-8 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center text-gray-900">
            Create Account
          </h2>

          <AnimatePresence mode="wait">
            {showVerificationMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-md bg-green-50 border border-green-200"
              >
                <p className="text-green-600 text-sm text-center">
                  A verification email has been sent to your email address.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!showVerificationMessage && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label 
                      htmlFor={firstNameId} 
                      className="block text-sm font-medium text-gray-700"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label 
                      htmlFor={lastNameId} 
                      className="block text-sm font-medium text-gray-700"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label 
                    htmlFor={emailId} 
                    className="block text-sm font-medium text-gray-700"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label 
                    htmlFor={passwordId} 
                    className="block text-sm font-medium text-gray-700"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label 
                    htmlFor={confirmPasswordId} 
                    className="block text-sm font-medium text-gray-700"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.2 }}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </motion.button>
              </form>

              <div className="relative my-4 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Cached Google Account Button */}
              {cachedGoogleAccount ? (
                <div className="space-y-3">
                  <motion.button
                    onClick={handleGoogleSignup}
                    disabled={loading}
                    className="w-full flex items-center justify-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
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
                  className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
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

          <p className="mt-4 sm:mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
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