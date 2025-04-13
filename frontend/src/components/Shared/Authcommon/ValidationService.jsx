import { debounce } from 'lodash';
import { 
  validatePassword, 
  validateEmail, 
  validateConfirmPassword
} from './PasswordValidation';

export class ValidationService {
  constructor(setError) {
    this.setError = setError;
    
    this.debouncedValidation = debounce((type, value, extraValue) => {
      this.validate(type, value, extraValue);
    }, 300);
  }

  validate(type, value, extraValue) {
    switch (type) {
      case 'email':
        return this.validateEmailField(value);
      case 'password':
        return this.validatePasswordField(value);
      case 'confirmPassword':
        return this.validateConfirmPasswordField(value, extraValue);
      case 'required':
        return this.validateRequiredField(value);
      default:
        return true;
    }
  }

  validateEmailField(value) {
    const emailError = validateEmail(value);
    if (emailError) {
      this.setError(emailError);
      return false;
    } 
    this.setError('');
    return true;
  }

  validatePasswordField(value) {
    const passwordErrors = validatePassword(value);
    if (passwordErrors.length > 0) {
      this.setError(passwordErrors[0]);
      return false;
    }
    this.setError('');
    return true;
  }

  validateConfirmPasswordField(value, password) {
    const confirmError = validateConfirmPassword(password, value);
    if (confirmError) {
      this.setError(confirmError);
      return false;
    }
    this.setError('');
    return true;
  }

  validateRequiredField(value) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      this.setError('This field is required');
      return false;
    }
    this.setError('');
    return true;
  }

  validateForm(formData) {
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      this.setError('All fields are required');
      return false;
    }
    
    const emailValidation = this.validate('email', formData.email);
    if (!emailValidation) return false;
    
    const passwordValidation = this.validate('password', formData.password);
    if (!passwordValidation) return false;
    
    if (formData.confirmPassword !== undefined) {
      const confirmValidation = this.validate(
        'confirmPassword', 
        formData.confirmPassword, 
        formData.password
      );
      if (!confirmValidation) return false;
    }
    
    return true;
  }
}