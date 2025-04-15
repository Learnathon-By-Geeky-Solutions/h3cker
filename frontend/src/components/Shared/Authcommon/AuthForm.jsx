import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import BrandLogo from '../Brandlogo/brandlogo';
import PropTypes from 'prop-types';

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
  return (
    <motion.div 
      className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-gray-900 overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Fixed background elements */}
      <div className="fixed top-0 -left-32 w-[30rem] h-[30rem] bg-blue-600 opacity-15 rounded-full filter blur-[64px] pointer-events-none" />
      <div className="fixed bottom-0 -right-32 w-[30rem] h-[30rem] bg-purple-500 opacity-15 rounded-full filter blur-[64px] pointer-events-none" />
      
      <div className="w-full max-w-md mx-auto relative z-10">
        <BrandLogo className="justify-center mb-8" />
        <div className="relative bg-gray-800/80 backdrop-blur-md rounded-[28px] border border-gray-700 shadow-2xl ring-1 ring-blue-900/30 p-6 sm:p-8 space-y-4 max-h-[80vh] overflow-y-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center text-white mb-2 sticky top-0 bg-gray-800/95 py-2 backdrop-blur-md z-10">
            {title}
          </h2>

          <AnimatePresence mode="wait">
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-[14px] bg-green-800/30 border border-green-700"
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
                    onClick={onGoogleLogin}
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
                    Continue as {cachedGoogleAccount.displayName || cachedGoogleAccount.email}
                  </motion.button>
                  
                  <div className="text-center">
                    <button 
                      onClick={() => setCachedGoogleAccount(null)}
                      className="text-xs text-gray-500 hover:text-gray-400"
                    >
                      Use a different account
                    </button>
                  </div>
                </div>
              ) : (
                <motion.button
                  onClick={onGoogleLogin}
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
                  Sign in with Google
                </motion.button>
              )}
            </>
          )}

          <p className="mt-5 sm:mt-6 text-center text-sm text-gray-400 sticky bottom-0 bg-gray-800/95 py-2 backdrop-blur-md">
            {footerText}{' '}
            <Link 
              to={footerLinkPath} 
              className="font-medium text-blue-400 hover:text-blue-300"
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