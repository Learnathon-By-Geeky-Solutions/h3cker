import { Card } from "flowbite-react";

const StatisticsCard = ({ label, value }) => {
  return (
    <Card className=" text-center w-1/3">
      <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {label}
      </h5>
      <p className="font-normal text-gray-700 dark:text-gray-400">{value}</p>
    </Card>
  );
};
export default StatisticsCard;