import React, { useState, useContext, useCallback } from 'react';
import { Play, BarChart2, PieChart, Eye, Activity, Plus, ChevronRight, X } from 'lucide-react';
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

// Using a reliable placeholder image service instead of a direct URL
const PLACEHOLDER_IMAGE = '/api/placeholder/400/250'; // Using reliable placeholder
// Whitelist of allowed URLs
const ALLOWED_URLS = ['/login', '/dashboard'];

const Home = () => {
  // Get auth context
  const { user } = useContext(AuthContext);
  const isLoggedIn = !!user;
  
  // Featured content data (replace with API call later)
  const featuredContent = {
    title: "Emotion Analytics for Video Ads",
    description: "Track viewer emotions and optimize your ad performance with advanced facial detection technology.",
    imageUrl: PLACEHOLDER_IMAGE,
    category: "VIDEO ANALYTICS"
  };
  
  // Ad categories (replace with API call later)
  const adCategories = [
    { id: 1, title: "Recently Analyzed Ads", icon: <Activity size={16} /> },
    { id: 2, title: "Highest Engagement Score", icon: <BarChart2 size={16} /> },
    { id: 3, title: "Strong Emotional Response", icon: <PieChart size={16} /> },
    { id: 4, title: "Most Viewed Campaigns", icon: <Eye size={16} /> }
  ];
  
  // Generate mock ads for development
  const generateMockAds = (count) => {
    const emotions = ['Happiness', 'Surprise', 'Neutral', 'Sadness'];
    const scores = [85, 76, 92, 64, 88, 71];
    
    return Array(count).fill().map((_, index) => ({
      id: index,
      title: `Ad Campaign ${index + 1}`,
      imageUrl: `/api/placeholder/400/225`, // Using a better aspect ratio for thumbnails
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Example video URL
      duration: "0:30",
      brand: `Brand ${index % 5 + 1}`,
      engagementScore: scores[index % scores.length],
      dominantEmotion: emotions[index % emotions.length],
      viewCount: Math.floor(Math.random() * 10000) + 1000 
    }));
  };

  return (
    <div className="bg-gray-900 min-h-screen">
      {!isLoggedIn ? (
        <NotLoggedInView />
      ) : (
        <LoggedInView 
          featuredContent={featuredContent} 
          adCategories={adCategories} 
          generateMockAds={generateMockAds} 
        />
      )}
    </div>
  );
};

// Component for users who aren't logged in
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

  // Feature cards data
  const features = [
    {
      icon: <BarChart2 size={36} />,
      title: "Emotion Heatmaps",
      description: "Visualize exactly when and how viewers emotionally respond to your content"
    },
    {
      icon: <PieChart size={36} />,
      title: "Detailed Analytics",
      description: "Track happiness, surprise, neutrality and other key emotional responses"
    },
    {
      icon: <Activity size={36} />,
      title: "Performance Insights",
      description: "Optimize your ads based on real emotional engagement data"
    }
  ];

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-700 opacity-20 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-600 opacity-20 rounded-full filter blur-3xl"></div>
      
      <div className="max-w-3xl text-center z-10 px-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight text-white">
          Unlock the <span className="text-blue-400">emotional impact</span> of your video ads
        </h1>
        <h2 className="text-xl md:text-2xl mb-8 text-gray-300">Facial emotion detection for data-driven advertising</h2>
        <p className="text-lg mb-10 text-gray-400">See how viewers really feel about your content. Optimize ad performance with EngageAnalytics.</p>
        
        <button 
          onClick={handleGetStarted}
          className="relative group px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-full overflow-hidden shadow-lg"
          type="button"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full shadow-md"></span>
          <span className="absolute inset-0 w-full h-full bg-white/15 rounded-full blur-[2px]"></span>
          <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-full transform transition-transform group-hover:scale-105"></span>
          <span className="relative flex items-center justify-center">
            Get Started <ChevronRight className="ml-2" size={20} />
          </span>
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
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

const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
      <div className="flex justify-center mb-4 text-blue-400">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  );
};

FeatureCard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired
};

// Component for logged-in users
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

// Featured content hero component
const HeroBillboard = ({ content }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const handlePlayDemo = useCallback(() => {
    setIsPlaying(true);
  }, []);
  
  const handleCloseVideo = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return (
    <div className="relative h-[70vh] overflow-hidden">
      {/* Placeholder for video/image */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-gray-900 z-0">
        <img 
          src={content.imageUrl} 
          alt={content.title} 
          className="w-full h-full object-cover opacity-70" 
        />
      </div>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-1"></div>
      
      {/* Video player */}
      {isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-90">
          <button 
            onClick={handleCloseVideo}
            className="absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-full z-30 hover:bg-gray-700 transition-all"
            type="button"
            aria-label="Close video"
          >
            <X size={16} />
          </button>
          <div className="w-4/5 h-4/5 max-w-4xl max-h-[75vh] relative">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
              title="Demo Video"
              style={{ border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
              className="z-20 shadow-2xl rounded"
            ></iframe>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 p-12 z-10 w-full md:w-2/3">
        <div className="mb-4 flex items-center">
          <span className="text-sm font-bold tracking-wide text-blue-400">{content.category}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">{content.title}</h1>
        <p className="text-lg mb-6 text-gray-300">{content.description}</p>
        <div className="flex gap-3">
          <button 
            onClick={handlePlayDemo}
            className="relative group flex items-center bg-blue-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg"
            type="button"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full shadow-md"></span>
            <span className="absolute inset-0 w-full h-full bg-white/15 rounded-full blur-[2px]"></span>
            <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-full transform transition-transform group-hover:scale-105"></span>
            <span className="relative flex items-center">
              <Play size={20} className="mr-2" /> Demo
            </span>
          </button>
          <button 
            className="relative group flex items-center bg-gray-800 px-6 py-3 rounded-full font-semibold text-white hover:bg-gray-700 transition-colors border border-gray-700"
            type="button"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-gray-800 to-gray-700 rounded-full shadow-md"></span>
            <span className="absolute inset-0 w-full h-full bg-white/5 rounded-full blur-[2px]"></span>
            <span className="absolute inset-0 w-full h-full bg-gray-800 rounded-full transform transition-transform group-hover:scale-105"></span>
            <span className="relative flex items-center">
              <BarChart2 size={20} className="mr-2" /> Dashboard
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

HeroBillboard.propTypes = {
  content: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    imageUrl: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired
  }).isRequired
};

// Row of advertisements
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

// Individual ad card
const AdCard = ({ ad }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  
  // Generate color based on engagement score
  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-blue-400";
    return "text-yellow-400";
  };
  
  const handlePlayClick = useCallback((e) => {
    e.stopPropagation();
    setShowVideo(true);
  }, []);
  
  const handleCloseVideo = useCallback(() => {
    setShowVideo(false);
  }, []);
  
    const handleMouseEnter = useCallback(() => {
      setIsHovered(true);
    }, []);
    
    const handleMouseLeave = useCallback(() => {
      setIsHovered(false);
    }, []);
    
    const handleKeyDown = useCallback((e) => {
      // Handle Enter or Space key press
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsHovered(true);
      }
      // Handle Escape key to close hover state
      if (e.key === 'Escape') {
        setIsHovered(false);
      }
    }, []);
    
    return (
      <button 
        className="relative rounded-md overflow-hidden shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg bg-gray-800 w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        onClick={() => setIsHovered(true)}
        type="button"
        aria-label={`View details for ${ad.title}`}
      >
        {showVideo ? (
          <div className="relative pt-[56.25%]"> {/* 16:9 aspect ratio */}
            <iframe 
              className="absolute inset-0 w-full h-full"
              src={ad.videoUrl}
              title={ad.title}
              style={{ border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
            <button 
              onClick={handleCloseVideo}
              className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 rounded-full p-1.5 text-white z-20 hover:bg-opacity-100"
              type="button"
              aria-label="Close video"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="relative pt-[56.25%]"> {/* Fixed aspect ratio container */}
              <img 
                src={ad.imageUrl} 
                alt={ad.title} 
                className="absolute inset-0 w-full h-full object-cover" 
              />
            </div>
            
            {/* Engagement score badge */}
            <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-full text-xs font-bold">
              <span className={getScoreColor(ad.engagementScore)}>{ad.engagementScore}%</span>
            </div>
            
            {isHovered && (
              <div className="absolute inset-0 bg-gray-900 bg-opacity-90 flex flex-col p-3">
                <div className="flex justify-between mb-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={handlePlayClick}
                      className="bg-blue-600 text-white rounded-full p-1.5 hover:bg-blue-500"
                      type="button"
                      aria-label="Play"
                    >
                      <Play size={16} />
                    </button>
                    <button 
                      className="border border-gray-600 rounded-full p-1.5 hover:border-white text-white"
                      type="button"
                      aria-label="Add to list"
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      className="border border-gray-600 rounded-full p-1.5 hover:border-white text-white"
                      type="button"
                      aria-label="View analytics"
                    >
                      <BarChart2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-1">
                  <h3 className="font-bold text-sm text-white">{ad.title}</h3>
                  <div className="flex items-center text-xs mt-1">
                    <span className={`${getScoreColor(ad.engagementScore)} font-bold mr-2`}>
                      {ad.engagementScore}% Engagement
                    </span>
                  </div>
                  <div className="flex flex-col mt-2 text-xs">
                    <span className="text-gray-300">Brand: {ad.brand}</span>
                    <span className="text-gray-300">Length: {ad.duration}</span>
                    <span className="text-gray-300">Dominant Emotion: {ad.dominantEmotion}</span>
                    <span className="text-gray-300">Views: {ad.viewCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </button>
    );
  };

AdCard.propTypes = {
  ad: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    imageUrl: PropTypes.string.isRequired,
    videoUrl: PropTypes.string.isRequired,
    duration: PropTypes.string.isRequired,
    brand: PropTypes.string.isRequired,
    engagementScore: PropTypes.number.isRequired,
    dominantEmotion: PropTypes.string.isRequired,
    viewCount: PropTypes.number.isRequired,
  }).isRequired
};

export default Home;