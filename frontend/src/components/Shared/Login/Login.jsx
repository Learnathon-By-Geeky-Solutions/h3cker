import React, { useState, useContext, useId, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import BrandLogo from '../Brandlogo/brandlogo';
import { ErrorMessage } from '../../common/ErrorMessage/ErrorMessage';

const Login = () => { 
    const { login, signInWithGoogle, maxDevices, getGoogleAuthCache } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [cachedGoogleAccount, setCachedGoogleAccount] = useState(null);
    
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    const emailId = useId();
    const passwordId = useId();

    useEffect(() => {
        const checkGoogleCache = () => {
            try {
                if (typeof getGoogleAuthCache === 'function') {
                    const cachedAuth = getGoogleAuthCache();
                    if (cachedAuth?.email) {
                        setCachedGoogleAccount(cachedAuth);
                    }
                }
            } catch (error) {
                console.error("Error retrieving cached Google account:", error);
            }
        };
        
        const timeoutId = setTimeout(checkGoogleCache, 100);
        return () => clearTimeout(timeoutId);
    }, [getGoogleAuthCache]);

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');

        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (error) {
            handleLoginError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoginError = (error) => {
        if (error.message === 'EMAIL_NOT_VERIFIED') {
            setAuthError('Please verify your email before logging in');
        } else if (error.message === 'MAX_DEVICES_REACHED') {
            setAuthError(`You've reached the maximum device limit (${maxDevices}). Please log out from another device to continue.`);
        } else {
            setAuthError('Invalid email or password');
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setAuthError('');

        try {
            await signInWithGoogle();
            navigate(from, { replace: true });
        } catch (error) {
            if (error.message === 'MAX_DEVICES_REACHED') {
                setAuthError(`You've reached the maximum device limit (${maxDevices}). Please log out from another device to continue.`);
            } else {
                setAuthError('Failed to sign in with Google');
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
                        Login
                    </h2>

                    <form onSubmit={handleEmailLogin} className="space-y-5 sm:space-y-6">
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
                                onChange={(e) => setEmail(e.target.value)}
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
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                        </div>

                        <AnimatePresence mode="wait">
                            {authError && <ErrorMessage error={authError} />}
                        </AnimatePresence>

                        <div className="flex justify-between items-center">
                            <Link 
                                to="/forgetpassword" 
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                Forgot password?
                            </Link>
                        </div>
                
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
                                {loading ? 'Signing in...' : 'Sign in'}
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
                                onClick={handleGoogleLogin}
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
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Use a different account
                                </button>
                            </div>
                        </div>
                    ) : (
                        <motion.button
                            onClick={handleGoogleLogin}
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

                    <p className="mt-5 sm:mt-6 text-center text-sm text-gray-400">
                        Don't have an account?{' '}
                        <Link 
                            to="/signup" 
                            className="font-medium text-blue-400 hover:text-blue-300"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default Login;