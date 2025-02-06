import React from "react";
import PropTypes from "prop-types";
import StatisticsCard from "../StatisticsCard/StattisticsCard";
const StatisticsSection = ({ title, stats }) => {
  return (
    <section>
      <h1 className="text-4xl font-bold text-center mb-6">{title}</h1>
      <div className="flex justify-center gap-6">
        {stats.map((stat) => (
          <StatisticsCard key={stat} label={stat.label} value={stat.value} />
        ))}
      </div>
    </section>
  );
};
StatisticsSection.propTypes = {
  title: PropTypes.string.isRequired,
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    })
  ).isRequired,
};
export default StatisticsSection;