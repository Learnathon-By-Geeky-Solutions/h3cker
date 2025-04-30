import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, PieChart, Activity, Video, ChevronRight } from 'lucide-react';
import FeatureCard from '../FeatureCard/FeatureCard.jsx';

const ALLOWED_URLS = ['/login', '/dashboard'];

const NotLoggedInView = () => {
  const navigate = useNavigate();

  const handleGetStarted = useCallback(() => {
    navigate('/login');
  }, [navigate]);
  
  const features = [
    {
      icon: <Video className="w-7 h-7 md:w-8 md:h-8" />,
      title: "Video Emotion Analytics",
      description: "Analyze viewer reactions to your video ads with DeepFace technology"
    },
    {
      icon: <BarChart2 className="w-7 h-7 md:w-8 md:h-8" />,
      title: "Emotional Heatmaps",
      description: "Visualize emotional responses linked to specific video segments"
    },
    {
      icon: <PieChart className="w-7 h-7 md:w-8 md:h-8" />,
      title: "Engagement Metrics",
      description: "Move beyond views and clicks with advanced audience engagement analysis"
    },
    {
      icon: <Activity className="w-7 h-7 md:w-8 md:h-8" />,
      title: "Interactive Dashboard",
      description: "Access actionable insights to improve your ad content strategy"
    }
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden py-8">
      <div className="absolute top-10 -left-40 w-80 h-80 bg-blue-700 opacity-20 rounded-full filter blur-3xl" />
      <div className="absolute bottom-10 -right-40 w-80 h-80 bg-purple-600 opacity-20 rounded-full filter blur-3xl" />
      
      <div className="max-w-4xl text-center z-10 px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-white">
          Unlock <span className="text-blue-400">emotional insights</span> from your video ads
        </h1>
        <h2 className="text-xl md:text-2xl mb-6 text-gray-300">Video emotion analytics powered by DeepFace technology</h2>
        <p className="text-lg mb-8 text-gray-400 max-w-2xl mx-auto">Understand how viewers truly react to your content with EngageAnalytics and make data-driven improvements to your video campaigns.</p>

        <button 
          onClick={handleGetStarted}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-medium rounded-full shadow-lg transition-all duration-300 flex items-center justify-center mx-auto"
          type="button"
        >
          Get Started <ChevronRight className="ml-2 w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 max-w-3xl mx-auto">
          {features.map((feature) => (
            <FeatureCard 
              key={feature.title}
              icon={feature.icon}
              title={feature.title} 
              description={feature.description} 
            />
          ))}
        </div>
        
        <div className="mt-10 text-sm text-gray-400">
          <p>Note: Our facial emotion detection feature is currently under development and will be available soon.</p>
        </div>
      </div>
    </div>
  );
};

export default NotLoggedInView;