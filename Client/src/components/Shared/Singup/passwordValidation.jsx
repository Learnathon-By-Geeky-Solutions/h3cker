// Password validation configuration
export const PASSWORD_CONFIG = {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
    REQUIREMENTS: {
      hasUppercase: /[A-Z]/,
      hasLowercase: /[a-z]/,
      hasNumber: /\d/,
      // Fixed special character regex to properly escape characters
      hasSpecialChar: /[!@#$%^&*()\-_+=[\]{};':"\\|,.<>/?]/
    }
  };
    
  // Separate error messages to avoid hard-coding in multiple places
  export const PASSWORD_ERRORS = {
    REQUIRED: 'Password is required',
    TOO_SHORT: `Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`,
    TOO_LONG: `Password must be at most ${PASSWORD_CONFIG.MAX_LENGTH} characters`,
    NO_UPPERCASE: 'Password must contain at least one uppercase letter',
    NO_LOWERCASE: 'Password must contain at least one lowercase letter',
    NO_NUMBER: 'Password must contain at least one number',
    NO_SPECIAL_CHAR: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)',
    WEAK_PASSWORD: 'Password is too weak',
    CONFIRM_PASSWORD_MISMATCH: 'Passwords do not match'
  };
    
  /**
   * Validate password based on configured requirements
   * @param {string} password - Password to validate
   * @returns {string[]} Array of error messages (empty if valid)
   */
  export const validatePassword = (password) => {
    const errors = [];
    
    // Check if password is provided
    if (!password) {
      errors.push(PASSWORD_ERRORS.REQUIRED);
      return errors;
    }
    
    // Length checks
    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
      errors.push(PASSWORD_ERRORS.TOO_SHORT);
    }
    if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
      errors.push(PASSWORD_ERRORS.TOO_LONG);
    }
    
    // Optional complexity checks (configurable based on your policy)
    const { REQUIREMENTS } = PASSWORD_CONFIG;
    
    if (!REQUIREMENTS.hasUppercase.test(password)) {
      errors.push(PASSWORD_ERRORS.NO_UPPERCASE);
    }
    
    if (!REQUIREMENTS.hasLowercase.test(password)) {
      errors.push(PASSWORD_ERRORS.NO_LOWERCASE);
    }
    
    if (!REQUIREMENTS.hasNumber.test(password)) {
      errors.push(PASSWORD_ERRORS.NO_NUMBER);
    }
    
    // Fixed the test for special characters
    if (!REQUIREMENTS.hasSpecialChar.test(password)) {
      errors.push(PASSWORD_ERRORS.NO_SPECIAL_CHAR);
    }
    
    return errors;
  };
    
  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {string} Error message or empty string if valid
   */
  export const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
    
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };
    
  /**
   * Validate password confirmation
   * @param {string} password - Original password
   * @param {string} confirmPassword - Password confirmation
   * @returns {string} Error message or empty string if valid
   */
  export const validateConfirmPassword = (password, confirmPassword) => {
    if (password !== confirmPassword) {
      return PASSWORD_ERRORS.CONFIRM_PASSWORD_MISMATCH;
    }
    return '';
  };