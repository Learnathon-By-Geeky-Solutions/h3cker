import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, PieChart, Activity, ChevronRight } from 'lucide-react';
import FeatureCard from '../FeatureCard/FeatureCard.jsx';

const ALLOWED_URLS = ['/login', '/dashboard'];

const NotLoggedInView = () => {
  const navigate = useNavigate();

  const handleGetStarted = useCallback(() => {
    const url = '/login';
    if (ALLOWED_URLS.includes(url)) {
      navigate(url);
    } else {
      console.error('Invalid URL redirection attempt:', url);
    }
  }, [navigate]);

  const features = [
    {
      icon: <BarChart2 size={32} />,
      title: "Emotion Heatmaps",
      description: "Visualize exactly when and how viewers emotionally respond to your content"
    },
    {
      icon: <PieChart size={32} />,
      title: "Detailed Analytics",
      description: "Track happiness, surprise, neutrality and other key emotional responses"
    },
    {
      icon: <Activity size={32} />,
      title: "Performance Insights",
      description: "Optimize your ads based on real emotional engagement data"
    }
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-x-hidden py-8">
      {/* Background elements */}
      <div className="absolute top-10 -left-40 w-72 h-72 md:w-96 md:h-96 bg-blue-700 opacity-20 rounded-full filter blur-3xl" />
      <div className="absolute bottom-10 -right-40 w-72 h-72 md:w-96 md:h-96 bg-purple-600 opacity-20 rounded-full filter blur-3xl" />
      
      <div className="max-w-3xl text-center z-10 px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 leading-tight text-white">
          Unlock the <span className="text-blue-400">emotional impact</span> of your video ads
        </h1>
        <h2 className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 text-gray-300">Facial emotion detection for data-driven advertising</h2>
        <p className="text-base sm:text-lg mb-8 sm:mb-10 text-gray-400">See how viewers really feel about your content. Optimize ad performance with EngageAnalytics.</p>
        
        <button 
          onClick={handleGetStarted}
          className="relative group px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white text-base sm:text-lg font-semibold rounded-full overflow-hidden shadow-lg"
          type="button"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full shadow-md" />
          <span className="absolute inset-0 w-full h-full bg-white/15 rounded-full blur-[2px]" />
          <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-full transform transition-transform group-hover:scale-105" />
          <span className="relative flex items-center justify-center whitespace-nowrap">
            Get Started <ChevronRight className="ml-2" size={18} />
          </span>
        </button>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16">
          {features.map((feature, index) => (
            <FeatureCard 
              key={feature.title}
              icon={feature.icon}
              title={feature.title} 
              description={feature.description} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotLoggedInView;