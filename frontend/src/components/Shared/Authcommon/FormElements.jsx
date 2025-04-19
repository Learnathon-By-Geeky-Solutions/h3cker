import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Reusable form input component with responsive design
 * Adapts to different screen sizes and provides proper feedback
 */
export const FormInput = ({ 
  id, 
  label, 
  type = 'text', 
  value, 
  onChange, 
  onBlur, 
  required = false, 
  name,
  helperText,
  placeholder,
  autoComplete
}) => (
  <div className="space-y-1.5 sm:space-y-2 w-full">
    <label 
      htmlFor={id} 
      className="block text-xs sm:text-sm font-medium text-gray-300"
    >
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <input
      id={id}
      type={type}
      name={name || id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="w-full min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700/50 border border-gray-600 rounded-[12px] sm:rounded-[14px] shadow-sm text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      required={required}
      aria-required={required}
      aria-invalid={helperText?.includes('error')}
      aria-describedby={helperText ? `${id}-helper-text` : undefined}
    />
    {helperText && (
      <p 
        id={`${id}-helper-text`}
        className={`text-xs mt-1 ${helperText.includes('error') ? 'text-red-400' : 'text-gray-400'}`}
      >
        {helperText}
      </p>
    )}
  </div>
);

FormInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  required: PropTypes.bool,
  name: PropTypes.string,
  helperText: PropTypes.string,
  placeholder: PropTypes.string,
  autoComplete: PropTypes.string
};

FormInput.defaultProps = {
  type: 'text',
  required: false,
  onBlur: () => {},
  name: '',
  helperText: '',
  placeholder: '',
  autoComplete: 'on'
};

/**
 * Password input component with toggle visibility
 * Fully responsive and accessible
 */
export const PasswordInput = ({ 
  id, 
  label, 
  value, 
  onChange, 
  onBlur, 
  required = false, 
  name,
  showPassword,
  setShowPassword,
  helperText,
  placeholder,
  autoComplete
}) => (
  <div className="space-y-1.5 sm:space-y-2 w-full">
    <label 
      htmlFor={id} 
      className="block text-xs sm:text-sm font-medium text-gray-300"
    >
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <div className="relative">
      <input
        id={id}
        type={showPassword ? "text" : "password"}
        name={name || id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700/50 border border-gray-600 rounded-[12px] sm:rounded-[14px] shadow-sm text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
        required={required}
        aria-required={required}
        aria-invalid={helperText?.includes('error')}
        aria-describedby={helperText ? `${id}-helper-text` : undefined}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-2.5 sm:right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
        aria-label={showPassword ? "Hide password" : "Show password"}
        tabIndex={0}
      >
        {showPassword ? <EyeOff size={16} className="sm:w-5 sm:h-5" /> : <Eye size={16} className="sm:w-5 sm:h-5" />}
      </button>
    </div>
    {helperText && (
      <p 
        id={`${id}-helper-text`}
        className={`text-xs mt-1 ${helperText.includes('error') ? 'text-red-400' : 'text-gray-400'}`}
      >
        {helperText}
      </p>
    )}
  </div>
);

PasswordInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  required: PropTypes.bool,
  name: PropTypes.string,
  showPassword: PropTypes.bool.isRequired,
  setShowPassword: PropTypes.func.isRequired,
  helperText: PropTypes.string,
  placeholder: PropTypes.string,
  autoComplete: PropTypes.string
};

PasswordInput.defaultProps = {
  required: false,
  onBlur: () => {},
  name: '',
  helperText: '',
  placeholder: '',
  autoComplete: 'current-password'
};

/**
 * Submit button component with loading state
 * Animates on hover and press
 */
export const SubmitButton = ({ text, loadingText, loading, disabled }) => (
  <motion.button
    type="submit"
    disabled={loading || disabled}
    className="relative group w-full shadow-lg h-auto overflow-hidden disabled:opacity-60"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.2 }}
  >
    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-[12px] sm:rounded-[14px] shadow-md" />
    <span className="absolute inset-0 w-full h-full bg-white/10 rounded-[12px] sm:rounded-[14px] blur-[1px]" />
    <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-[12px] sm:rounded-[14px] transform transition-transform group-hover:scale-[1.02] group-hover:brightness-110" />
    <span className="relative flex items-center justify-center text-white font-medium py-2 sm:py-2.5 text-sm">
      {loading ? (
        <div className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText}
        </div>
      ) : text}
    </span>
  </motion.button>
);

SubmitButton.propTypes = {
  text: PropTypes.string.isRequired,
  loadingText: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  disabled: PropTypes.bool
};

SubmitButton.defaultProps = {
  loading: false,
  disabled: false
};
export const SocialButton = ({ onClick, icon, text, disabled, className }) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center justify-center py-2 sm:py-2.5 px-3 sm:px-4 border border-gray-600 rounded-[12px] sm:rounded-[14px] shadow-md text-xs sm:text-sm font-medium text-white bg-gray-700/50 hover:bg-gray-700/70 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-colors ${className || ''}`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.2 }}
  >
    {icon && (
      <span className="mr-2.5">{icon}</span>
    )}
    <span className="truncate">{text}</span>
  </motion.button>
);

SocialButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  icon: PropTypes.node,
  text: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string
};

SocialButton.defaultProps = {
  disabled: false,
  icon: null,
  className: ''
};