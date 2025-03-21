import React from 'react';
import PropTypes from 'prop-types';
import AdCard from '../AdCard/AdCard';

const AdRow = ({ title, icon, ads }) => {
  return (
    <div className="mb-10 px-6 md:px-12">
      <h2 className="text-xl font-bold mb-5 flex items-center text-white">
        {icon && <span className="mr-2 text-blue-400">{icon}</span>}
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {ads.map((ad) => (
          <AdCard key={ad.id} ad={ad} />
        ))}
      </div>
    </div>
  );
};

AdRow.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  ads: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired
    })
  ).isRequired
};

export default AdRow;