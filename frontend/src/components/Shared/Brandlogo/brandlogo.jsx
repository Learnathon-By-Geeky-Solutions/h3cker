import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

const BrandLogo = ({ className = '' }) => {
  return (
    <Link to="/" className={`flex items-center space-x-2 ${className}`}>
      <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
        <BarChart3 size={32} className="text-white" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-white">
          Engage Analytics
        </h1>
        <p className="text-sm text-white opacity-70">
          Unlock Your Data Potential
        </p>
      </div>
    </Link>
  );
};
BrandLogo.propTypes = {
  className: PropTypes.string,
};

export default BrandLogo;
