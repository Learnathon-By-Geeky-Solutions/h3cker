import React, { useState, useEffect } from 'react';
import { Card, Badge, Spinner, Alert } from 'flowbite-react';
import { DollarSign, Award, History } from 'lucide-react';
import PropTypes from 'prop-types';
import ApiService from '../../../utils/ApiService';

const UserPointsCard = ({ compact = false }) => {
  const [pointsData, setPointsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPointsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await ApiService.get('user/points/');
        setPointsData(response);
      } catch (err) {
        console.error('Error fetching points data:', err);
        setError('Failed to load points information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPointsData();
  }, []);

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <div className="flex justify-center items-center py-4">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <Alert color="failure">
          {error}
        </Alert>
      </Card>
    );
  }

  if (!pointsData) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <p className="text-gray-400 text-center py-4">No points data available</p>
      </Card>
    );
  }

  

  return (
    <Card className="bg-gray-800 border-gray-700">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Award className="mr-2 text-yellow-400" size={24} />
          Your Reward Points 
        </h3>
        <Badge color="indigo" size="xl" className="px-4 py-2 text-lg">
          {pointsData.points} Points
        </Badge>
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Current Balance</p>
          <p className="text-2xl font-bold text-white">{pointsData.points} Points</p>
        </div>
        <div className="bg-gray-700/50 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Total Points Earned</p>
          <p className="text-2xl font-bold text-white">{pointsData.points_earned} Points</p>
        </div>
        <div className="bg-green-900/30 border border-green-800 p-4 rounded-lg">
          <p className="text-sm text-gray-300">Points Value</p>
          <p className="text-2xl font-bold text-white flex items-center">
            <DollarSign size={20} className="text-green-400 mr-1" />
            {pointsData.points_value} BDT
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Conversion rate: {pointsData.conversion_rate} BDT per point
          </p>
        </div>
      </div>
      
      <div className="mt-6">
        <h4 className="text-lg font-medium text-white flex items-center mb-4">
          <History className="mr-2 text-blue-400" size={18} />
          Points Activity
        </h4>
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <p className="text-gray-400">
            Complete video evaluations to earn more points! Each evaluation is worth 10 points.
          </p>
        </div>
      </div>
    </Card>
  );
};

UserPointsCard.propTypes = {
  compact: PropTypes.bool
};

export default UserPointsCard;