import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import BrandLogo from '../Brandlogo/brandlogo';
import PropTypes from 'prop-types';
import { SocialButton } from './FormElements';

const AuthForm = ({ 
  title,
  children,
  error,
  loading,
  onGoogleLogin,
  cachedGoogleAccount,
  setCachedGoogleAccount,
  footerText,
  footerLinkText,
  footerLinkPath,
  successMessage
}) => {
  // Background animation variants
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

  const isDeviceLimitError = error?.toLowerCase().includes('maximum device limit') || 
                             error?.toLowerCase().includes('device limit') || 
                             error?.includes('MAX_DEVICES_REACHED');

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
            {title}
          </h2>


          <AnimatePresence mode="wait">
            {isDeviceLimitError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="p-3 sm:p-4 rounded-[12px] sm:rounded-[14px] bg-red-800/30 border border-red-700"
              >
                <p className="text-red-400 text-sm text-center">
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="p-3 sm:p-4 rounded-[12px] sm:rounded-[14px] bg-green-800/30 border border-green-700"
              >
                <p className="text-green-400 text-sm text-center">
                  {successMessage}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!successMessage && (
            <>
              <div className="pb-2">
                {children}
              </div>
              
              {!isDeviceLimitError && (
                <>
                  <div className="relative my-4 sm:my-5 md:my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-xs sm:text-sm">
                      <span className="px-2 bg-gray-800 text-gray-400">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {cachedGoogleAccount ? (
                    <div className="space-y-3">
                      <SocialButton
                        onClick={onGoogleLogin}
                        disabled={loading}
                        className="bg-blue-500/20 hover:bg-blue-500/30 border-blue-500"
                        icon={
                          cachedGoogleAccount.photoURL ? (
                            <img 
                              src={cachedGoogleAccount.photoURL} 
                              alt="Profile" 
                              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" 
                            />
                          ) : (
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 24 24" 
                              className="w-4 h-4 sm:w-5 sm:h-5 fill-current"
                            >
                              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                            </svg>
                          )
                        }
                        text={`Continue as ${cachedGoogleAccount.displayName || cachedGoogleAccount.email}`}
                      />
                      
                      <div className="text-center">
                        <button 
                          onClick={() => setCachedGoogleAccount(null)}
                          className="text-xs text-gray-500 hover:text-gray-400 underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                        >
                          Use a different account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <SocialButton
                      onClick={onGoogleLogin}
                      disabled={loading}
                      icon={
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          className="w-4 h-4 sm:w-5 sm:h-5 fill-current"
                        >
                          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                        </svg>
                      }
                      text="Sign in with Google"
                    />
                  )}
                </>
              )}
            </>
          )}


          <p className="mt-4 sm:mt-5 md:mt-6 text-center text-xs sm:text-sm text-gray-400 sticky bottom-0 py-2">
            {footerText}{' '}
            <Link 
              to={footerLinkPath} 
              className="font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:underline"
            >
              {footerLinkText}
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
};


AuthForm.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  error: PropTypes.string,
  loading: PropTypes.bool,
  onGoogleLogin: PropTypes.func.isRequired,
  cachedGoogleAccount: PropTypes.shape({
    photoURL: PropTypes.string,
    displayName: PropTypes.string,
    email: PropTypes.string
  }),
  setCachedGoogleAccount: PropTypes.func.isRequired,
  footerText: PropTypes.string.isRequired,
  footerLinkText: PropTypes.string.isRequired,
  footerLinkPath: PropTypes.string.isRequired,
  successMessage: PropTypes.string
};


AuthForm.defaultProps = {
  children: null,
  error: '',
  loading: false,
  cachedGoogleAccount: null,
  successMessage: null
};

export default AuthForm;