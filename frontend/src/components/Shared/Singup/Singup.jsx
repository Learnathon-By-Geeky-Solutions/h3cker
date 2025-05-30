import React, { useId, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ErrorMessage } from '../../common/ErrorMessage/ErrorMessage';
import AuthForm from '../Authcommon/AuthForm';
import { FormInput, PasswordInput, SubmitButton } from '../Authcommon/FormElements';
import { useSignupForm, useGoogleAuth } from '../Authcommon/useAuth';
import { 
  validatePassword, 
  validateEmail, 
  validateConfirmPassword
} from './PasswordValidation';

const Signup = () => {
  const {
    formData,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    error,
    setError,
    loading,
    showVerificationMessage,
    handleBlur,
    handleChange,
    handleSubmit
  } = useSignupForm();

  const {
    loading: googleLoading,
    authError: googleAuthError,
    cachedGoogleAccount,
    setCachedGoogleAccount,
    handleGoogleLogin
  } = useGoogleAuth();

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();


  const combinedError = error || googleAuthError;
  const isDeviceLimitError = 
    combinedError?.toLowerCase().includes('maximum device limit') || 
    combinedError?.toLowerCase().includes('device limit') || 
    combinedError?.includes('MAX_DEVICES_REACHED');

  const validateAllFields = useCallback(() => {
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
  }, [formData, setError]);

  const handleFormSubmit = (e) => {
    handleSubmit(e, validateAllFields);
  };

  return (
    <AuthForm
      title="Create Account"
      error={combinedError}
      loading={loading || googleLoading}
      onGoogleLogin={handleGoogleLogin}
      cachedGoogleAccount={cachedGoogleAccount}
      setCachedGoogleAccount={setCachedGoogleAccount}
      footerText="Already have an account?"
      footerLinkText="Login"
      footerLinkPath="/login"
      successMessage={showVerificationMessage ? "A verification email has been sent to your email address. Please verify your email then return to the login page." : null}
    >
      <form onSubmit={handleFormSubmit} className="space-y-5 sm:space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            id={firstNameId}
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <FormInput
            id={lastNameId}
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
        </div>

        <FormInput
          id={emailId}
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          required
        />

        <PasswordInput
          id={passwordId}
          label="Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          required
          helperText="Must include uppercase, lowercase, number, and special character."
        />

        <PasswordInput
          id={confirmPasswordId}
          label="Confirm Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          showPassword={showConfirmPassword}
          setShowPassword={setShowConfirmPassword}
          required
        />

        <AnimatePresence mode="wait">
          {combinedError && !isDeviceLimitError && <ErrorMessage error={combinedError} />}
        </AnimatePresence>

        <SubmitButton
          text="Create Account"
          loadingText="Creating Account..."
          loading={loading}
        />
      </form>
    </AuthForm>
  );
};

export default Signup;