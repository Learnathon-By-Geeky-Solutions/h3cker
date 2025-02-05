import React from "react";
import StatisticsCard from "../StatisticsCard/StattisticsCard";
const StatisticsSection = ({ title, stats }) => {
  return (
    <section>
      <h1 className="text-4xl font-bold text-center mb-6">{title}</h1>
      <div className="flex justify-center gap-6">
        {stats.map((stat, index) => (
          <StatisticsCard key={index} label={stat.label} value={stat.value} />
        ))}
      </div>
    </section>
  );
};

export default StatisticsSection;