import React, { useContext } from 'react';
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";
import { Activity, BarChart2, PieChart, Eye } from 'lucide-react';
import NotLoggedInView from '../../Shared/NotLoggedInView/NotLoggedInView';
import LoggedInView from '../../Shared/LoggedInView/LoggedInView';

/*
├── Home.jsx               # Main component file
├── FeatureCard.jsx        # Feature card component for not logged in view
├── NotLoggedInView.jsx    # Component for users who aren't logged in
├── LoggedInView.jsx       # Component for logged-in users
├── HeroBillboard.jsx      # Featured content hero component
├── AdRow.jsx              # Row of advertisements component
└── AdCard.jsx             # Individual ad card component
*/

// Using a reliable placeholder image service instead of a direct URL
const PLACEHOLDER_IMAGE = '/api/placeholder/400/250'; // Using reliable placeholder

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

export default Home;