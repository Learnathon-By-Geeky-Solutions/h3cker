import React, { useState, useContext, useId, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../Brandlogo/brandlogo';

const ForgetPassword = () => {
  const { resetPassword } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const emailId = useId();

  useEffect(() => {
    const loadCooldown = () => {
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
        setError('No account exists with this email address');
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
  
  let buttonText = '';
  if (loading) {
    buttonText = 'Sending...';
  } else if (cooldown > 0) {
    buttonText = `Retry in ${cooldown}s`;
  } else {
    buttonText = 'Send Reset Link';
  }

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
            Reset Password
          </h2>

          <form onSubmit={handlePasswordReset} className="space-y-4 sm:space-y-6">
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
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (cooldown > 0 && e.target.value !== email) {
                    setCooldown(0);
                    document.cookie = 'resetCooldown=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                aria-required="true"
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 rounded-md bg-red-50 border border-red-200"
                >
                  <p className="text-red-600 text-sm">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 rounded-md bg-green-50 border border-green-200"
                >
                  <p className="text-green-600 text-sm">
                    If an account exists with this email address, you will receive a password reset link shortly.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2 }}
            >
              {buttonText}
            </motion.button>
          </form>

          <p className="mt-4 sm:mt-6 text-center text-sm text-gray-600">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ForgetPassword;