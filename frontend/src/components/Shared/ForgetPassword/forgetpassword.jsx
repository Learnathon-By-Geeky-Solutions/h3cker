import React, { useState, useContext, useId, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../Brandlogo/brandlogo';
import { FormInput, SubmitButton } from '../Authcommon/FormElements';
import PropTypes from 'prop-types';

/**
 * Error message component with animation
 */
const ErrorMessage = ({ error }) => (
  <motion.div
    initial={{ opacity: 0, y: -15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.3 }}
    className="p-3 rounded-[12px] sm:rounded-[14px] bg-red-800/30 border border-red-700"
  >
    <p className="text-red-400 text-xs sm:text-sm">{error}</p>
  </motion.div>
);

ErrorMessage.propTypes = {
  error: PropTypes.string.isRequired
};

/**
 * Success message component with animation
 */
const SuccessMessage = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.3 }}
    className="p-3 rounded-[12px] sm:rounded-[14px] bg-green-800/30 border border-green-700"
  >
    <p className="text-green-400 text-xs sm:text-sm">{message}</p>
  </motion.div>
);

SuccessMessage.propTypes = {
  message: PropTypes.string.isRequired
};

const ForgetPassword = () => {
  const { resetPassword } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const emailId = useId();

  const backgroundVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        duration: 1.2, 
        ease: 'easeOut'
      }
    }
  };

  useEffect(() => {
    const loadCooldown = () => {
      try {
        const cooldownData = document.cookie
          .split('; ')
          .find(row => row.startsWith('resetCooldown='));
        
        if (cooldownData) {
          const [email, expiry] = cooldownData.split('=')[1].split(':');
          const timeLeft = Math.ceil((parseInt(expiry) - Date.now()) / 1000);
          
          if (timeLeft > 0) {
            setEmail(decodeURIComponent(email));
            setCooldown(timeLeft);
            startCooldownTimer(timeLeft);
          } else {
      
            document.cookie = 'resetCooldown=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        }
      } catch (error) {
        console.error('Error loading cooldown:', error);
        document.cookie = 'resetCooldown=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    };

    loadCooldown();
  }, []);

  const startCooldownTimer = (duration) => {
    const timer = setInterval(() => {
      setCooldown((prevCooldown) => {
        if (prevCooldown <= 1) {
          clearInterval(timer);
          document.cookie = 'resetCooldown=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          return 0;
        }
        return prevCooldown - 1;
      });
    }, 1000);
  };

  const setCooldownCookie = (email, durationSeconds) => {
    const expires = Date.now() + (durationSeconds * 1000);
    document.cookie = `resetCooldown=${encodeURIComponent(email)}:${expires}; path=/; max-age=${durationSeconds}`;
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again`);
      return;
    }

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
      
      const cooldownDuration = 60;
      setCooldown(cooldownDuration);
      setCooldownCookie(email, cooldownDuration);
      startCooldownTimer(cooldownDuration);

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setSuccess(true);
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Failed to send reset email. Please try again later.');
        console.error('Password reset error:', error);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.div 
      className="min-h-screen flex flex-col justify-center items-center px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 bg-gray-900 overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <motion.div 
        className="fixed top-0 -left-32 w-64 sm:w-96 h-64 sm:h-96 bg-blue-600 opacity-15 rounded-full filter blur-[40px] sm:blur-[64px] pointer-events-none"
        variants={backgroundVariants}
        initial="initial"
        animate="animate"
      />
      <motion.div 
        className="fixed bottom-0 -right-32 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500 opacity-15 rounded-full filter blur-[40px] sm:blur-[64px] pointer-events-none"
        variants={backgroundVariants}
        initial="initial"
        animate="animate"
      />
      
      <div className="w-full max-w-md mx-auto relative z-10">
 
        <div className="flex justify-center mb-6 sm:mb-8">
          <BrandLogo className="w-auto h-10 sm:h-12" />
        </div>
  
        <div className="relative bg-gray-800/80 backdrop-blur-md rounded-[16px] sm:rounded-[20px] md:rounded-[28px] border border-gray-700 shadow-2xl ring-1 ring-blue-900/30 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 max-h-[85vh] overflow-y-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-white mb-2 sm:mb-3 sticky top-0 py-2 z-10">
            Reset Password
          </h2>

          <form onSubmit={handlePasswordReset} className="space-y-4 sm:space-y-5">
            <FormInput
              id={emailId}
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (cooldown > 0 && e.target.value !== email) {
                  // Reset cooldown if email changes
                  setCooldown(0);
                  document.cookie = 'resetCooldown=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                }
              }}
              required
              placeholder="Enter your email address"
              autoComplete="email"
            />

            <AnimatePresence mode="wait">
              {error && <ErrorMessage error={error} />}
              {success && (
                <SuccessMessage 
                  message="If an account exists with this email address, you will receive a password reset link shortly."
                />
              )}
            </AnimatePresence>

            <SubmitButton
              text="Send Reset Link"
              loadingText={cooldown > 0 ? `Retry in ${cooldown}s` : "Sending..."}
              loading={loading || cooldown > 0}
              disabled={loading || cooldown > 0}
            />
          </form>

          {/* Back to login link */}
          <p className="mt-4 sm:mt-5 md:mt-6 text-center text-xs sm:text-sm text-gray-400 sticky bottom-0 py-2 ">
            <Link
              to="/login"
              className="font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:underline inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ForgetPassword;