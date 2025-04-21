import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ErrorMessage } from '../../common/ErrorMessage/ErrorMessage';
import AuthForm from '../Authcommon/AuthForm';
import { FormInput, PasswordInput, SubmitButton } from '../Authcommon/FormElements';
import { useLoginForm, useGoogleAuth } from '../Authcommon/useAuth';

const Login = () => { 
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    loading,
    authError,
    handleEmailLogin
  } = useLoginForm();

  const {
    loading: googleLoading,
    authError: googleAuthError,
    cachedGoogleAccount,
    setCachedGoogleAccount,
    handleGoogleLogin
  } = useGoogleAuth();

  const emailId = useId();
  const passwordId = useId();

  
  
  const combinedError = authError || googleAuthError;

  const isDeviceLimitError = 
    combinedError?.toLowerCase().includes('maximum device limit') || 
    combinedError?.toLowerCase().includes('device limit') || 
    combinedError?.includes('MAX_DEVICES_REACHED');

  return (
    <AuthForm
      title="Login"
      error={combinedError}
      loading={loading || googleLoading}
      onGoogleLogin={handleGoogleLogin}
      cachedGoogleAccount={cachedGoogleAccount}
      setCachedGoogleAccount={setCachedGoogleAccount}
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkPath="/signup"
    >
      <form onSubmit={handleEmailLogin} className="space-y-5 sm:space-y-6">
        <FormInput
          id={emailId}
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordInput
          id={passwordId}
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          required
        />

        <AnimatePresence mode="wait">
          {combinedError && !isDeviceLimitError && <ErrorMessage error={combinedError} />}
        </AnimatePresence>

        <div className="flex justify-between items-center">
          <Link 
            to="/forgetpassword" 
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton
          text="Sign in"
          loadingText="Signing in..."
          loading={loading || googleLoading}
        />
      </form>
    </AuthForm>
  );
};

export default Login;