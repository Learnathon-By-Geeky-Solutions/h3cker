import React from 'react';
import PropTypes from 'prop-types';
import HeroBillboard from '../HeroBillboard/HeroBillboard.jsx';
import AdRow from '../AdRow/AdRow';

const LoggedInView = ({ featuredContent, adCategories, generateMockAds }) => {
  return (
    <div className="pt-16">
      {/* Hero billboard */}
      <HeroBillboard content={featuredContent} />
      
      {/* Ad Rows */}
      <div className="pb-10 bg-gray-900">
        {adCategories.map((category) => (
          <AdRow 
            key={category.id} 
            title={category.title} 
            icon={category.icon}
            ads={generateMockAds(5)} // 5 items per row
          />
        ))}
      </div>
    </div>
  );
};

LoggedInView.propTypes = {
  featuredContent: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    imageUrl: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired
  }).isRequired,
  adCategories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      title: PropTypes.string.isRequired,
      icon: PropTypes.node
    })
  ).isRequired,
  generateMockAds: PropTypes.func.isRequired
};

export default LoggedInView;