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

  // Load cooldown from cookie
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
            Reset Password
          </h2>

          <form onSubmit={handlePasswordReset} className="space-y-5 sm:space-y-6">
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
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (cooldown > 0 && e.target.value !== email) {
                    setCooldown(0);
                    document.cookie = 'resetCooldown=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  }
                }}
                className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-[14px] shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="p-3 rounded-[14px] bg-red-800/30 border border-red-700"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 rounded-[14px] bg-green-800/30 border border-green-700"
                >
                  <p className="text-green-400 text-sm">
                    If an account exists with this email address, you will receive a password reset link shortly.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || cooldown > 0}
              className="relative group w-full shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-[14px] shadow-md" />
              <span className="absolute inset-0 w-full h-full bg-white/10 rounded-[14px] blur-[1px]" />
              <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-[14px] transform transition-transform group-hover:scale-[1.02]" />
              <span className="relative flex items-center justify-center text-white font-medium py-2.5 text-sm">
                {buttonText}
              </span>
            </motion.button>
          </form>

          <p className="mt-5 sm:mt-6 text-center text-sm text-gray-400">
            <Link
              to="/login"
              className="font-medium text-blue-400 hover:text-blue-300"
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