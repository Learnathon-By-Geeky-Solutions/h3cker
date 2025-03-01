import React, { useState, useContext, useId, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import BrandLogo from '../Brandlogo/brandlogo';
import { ErrorMessage } from '../../common/ErrorMessage';

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
                        Login
                    </h2>

                    <form onSubmit={handleEmailLogin} className="space-y-4 sm:space-y-6">
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
                                onChange={(e) => setEmail(e.target.value)}
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
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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

                        <AnimatePresence mode="wait">
                            {authError && <ErrorMessage error={authError} />}
                        </AnimatePresence>

                        <div className="flex justify-between items-center">
                            <Link 
                                to="/forgetpassword" 
                                className="text-sm text-blue-600 hover:text-blue-500"
                            >
                                Forgot password?
                            </Link>
                        </div>
                
                        <motion.button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ duration: 0.2 }}
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
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
                                onClick={handleGoogleLogin}
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
                            Sign in with Google
                        </motion.button>
                    )}

                    <p className="mt-4 sm:mt-6 text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link 
                            to="/signup" 
                            className="font-medium text-blue-600 hover:text-blue-500"
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