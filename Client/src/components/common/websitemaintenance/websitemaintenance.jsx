import React, { useEffect, useState } from "react";
import { Settings, Clock, AlertTriangle, ChevronRight } from "lucide-react";

const UnderMaintenance = () => {
  const [progress, setProgress] = useState(0);
  
  // Simulate progress loading effect
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(oldProgress => {
        const newProgress = Math.min(oldProgress + 1, 100);
        if (newProgress === 100) {
          clearInterval(timer);
        }
        return newProgress;
      });
    }, 150);
    
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background elements - matching your home page style */}
      <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-700 opacity-20 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-600 opacity-20 rounded-full filter blur-3xl"></div>
      
      <div className="max-w-xl text-center z-10 px-6">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Settings className="text-blue-400 w-24 h-24 animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-gray-900 rounded-full w-12 h-12"></div>
            </div>
            <AlertTriangle className="absolute inset-0 m-auto text-yellow-400 w-8 h-8" />
          </div>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-white">
          We're <span className="text-blue-400">upgrading</span> our systems
        </h1>
        
        <p className="text-lg mb-8 text-gray-300">
          Our team is working on implementing new emotion analytics features to make your experience even better.
        </p>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-3 mb-6 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-center text-gray-400 mb-8">
          <Clock className="w-5 h-5 mr-2" /> 
          <span>Estimated completion time: 2 hours</span>
        </div>
        
        {/* Button matching your home page style */}
        <button 
          onClick={() => window.location.reload()}
          className="relative group px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-full overflow-hidden shadow-lg"
          type="button"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full shadow-md"></span>
          <span className="absolute inset-0 w-full h-full bg-white/15 rounded-full blur-[2px]"></span>
          <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-full transform transition-transform group-hover:scale-105"></span>
          <span className="relative flex items-center justify-center">
            Try Again <ChevronRight className="ml-2" size={20} />
          </span>
        </button>
        
        {/* Feature cards matching your home page */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {[
            {
              id: "coming-soon",
              title: "Coming Soon",
              description: "Enhanced emotion heatmaps with improved accuracy"
            },
            {
              id: "under-development",
              title: "Under Development",
              description: "Real-time audience sentiment tracking dashboard"
            },
            {
              id: "almost-ready",
              title: "Almost Ready",
              description: "Advanced AI-powered insights and recommendations"
            }
          ].map((feature) => (
            <div 
              key={feature.id} 
              className="bg-gray-800 bg-opacity-50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all duration-300"
            >
              <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Additional style to be added to the component */}
      <style>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default UnderMaintenance;