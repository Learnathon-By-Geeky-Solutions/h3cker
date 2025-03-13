import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Play, BarChart2, X } from 'lucide-react';

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

export default HeroBillboard;