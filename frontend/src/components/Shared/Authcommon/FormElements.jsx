import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import PropTypes from 'prop-types';

export const FormInput = ({ 
  id, 
  label, 
  type = 'text', 
  value, 
  onChange, 
  onBlur, 
  required = false, 
  name,
  helperText
}) => (
  <div className="space-y-2">
    <label 
      htmlFor={id} 
      className="block text-sm font-medium text-gray-300"
    >
      {label}
    </label>
    <input
      id={id}
      type={type}
      name={name || label.toLowerCase()}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-[14px] shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      required={required}
    />
    {helperText && (
      <p className="text-xs text-gray-400 mt-1">
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
  helperText: PropTypes.string
};

FormInput.defaultProps = {
  type: 'text',
  required: false,
  onBlur: () => {},
  name: '',
  helperText: ''
};

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
  helperText
}) => (
  <div className="space-y-2">
    <label 
      htmlFor={id} 
      className="block text-sm font-medium text-gray-300"
    >
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type={showPassword ? "text" : "password"}
        name={name || label.toLowerCase()}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-[14px] shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        required={required}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
    {helperText && (
      <p className="text-xs text-gray-400 mt-1">
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
  helperText: PropTypes.string
};

PasswordInput.defaultProps = {
  required: false,
  onBlur: () => {},
  name: '',
  helperText: ''
};

export const SubmitButton = ({ text, loadingText, loading, disabled }) => (
  <motion.button
    type="submit"
    disabled={loading || disabled}
    className="relative group w-full shadow-lg"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.2 }}
  >
    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-[14px] shadow-md" />
    <span className="absolute inset-0 w-full h-full bg-white/10 rounded-[14px] blur-[1px]" />
    <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-[14px] transform transition-transform group-hover:scale-[1.02]" />
    <span className="relative flex items-center justify-center text-white font-medium py-2.5 text-sm">
      {loading ? loadingText : text}
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