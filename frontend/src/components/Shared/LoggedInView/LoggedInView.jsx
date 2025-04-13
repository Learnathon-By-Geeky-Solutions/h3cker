export const PASSWORD_CONFIG = {
  MIN_LENGTH: 6,
  MAX_LENGTH: 128,
  REQUIREMENTS: {
    hasUppercase: /[A-Z]/,
    hasLowercase: /[a-z]/,
    hasNumber: /\d/,
    hasSpecialChar: /[!@#$%^&*()\-_+=[\]{};':"\\|,.<>/?]/
  }
};

export const getPasswordError = (errorType) => {
  const errorMessages = {
    REQUIRED: 'Password is required',
    TOO_SHORT: `Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`,
    TOO_LONG: `Password must be at most ${PASSWORD_CONFIG.MAX_LENGTH} characters`,
    NO_UPPERCASE: 'Password must contain at least one uppercase letter',
    NO_LOWERCASE: 'Password must contain at least one lowercase letter',
    NO_NUMBER: 'Password must contain at least one number',
    NO_SPECIAL_CHAR: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)',
    CONFIRM_PASSWORD_MISMATCH: 'Passwords do not match'
  };
  
  return errorMessages[errorType] || 'Invalid password';
};

export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push(getPasswordError('REQUIRED'));
    return errors;
  }
  
  if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
    errors.push(getPasswordError('TOO_SHORT'));
  }
  if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
    errors.push(getPasswordError('TOO_LONG'));
  }
  
  const { REQUIREMENTS } = PASSWORD_CONFIG;
  
  if (!REQUIREMENTS.hasUppercase.test(password)) {
    errors.push(getPasswordError('NO_UPPERCASE'));
  }
  
  if (!REQUIREMENTS.hasLowercase.test(password)) {
    errors.push(getPasswordError('NO_LOWERCASE'));
  }
  
  if (!REQUIREMENTS.hasNumber.test(password)) {
    errors.push(getPasswordError('NO_NUMBER'));
  }
  
  if (!REQUIREMENTS.hasSpecialChar.test(password)) {
    errors.push(getPasswordError('NO_SPECIAL_CHAR'));
  }
  
  return errors;
};

export const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
  
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return '';
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return getPasswordError('CONFIRM_PASSWORD_MISMATCH');
  }
  return '';
};