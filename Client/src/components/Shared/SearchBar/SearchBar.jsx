import React, { useState } from "react";
import { HiSearch } from "react-icons/hi";
import PropTypes from 'prop-types';

const SearchBar = ({ className = "", placeholder = "Search..." }) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-105' : ''} ${className}`}>
      <input
        type="search"
        placeholder={placeholder}
        className="w-full py-1.5 pl-10 pr-4 bg-gray-800/50 border border-gray-700 focus:border-blue-500 rounded-full text-white placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-500/50"
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
      />
      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
        <HiSearch className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
};
SearchBar.propTypes = {
  className: PropTypes.string,
  placeholder: PropTypes.string,
};

export default SearchBar;
