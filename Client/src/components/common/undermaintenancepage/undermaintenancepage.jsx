import React from "react";
import PropTypes from 'prop-types';
import { Construction, ChevronLeft, ArrowRight } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const PageUnderConstruction = ({ pageName = "This page" }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background elements - matching your home page style */}
      <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-700 opacity-20 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-600 opacity-20 rounded-full filter blur-3xl"></div>
      
      <div className="max-w-xl text-center z-10 px-6">
        <div className="flex justify-center mb-6">
          <Construction className="text-blue-400 w-20 h-20" />
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-white">
          <span className="text-blue-400">{pageName}</span> is under construction
        </h1>
        
        <p className="text-lg mb-10 text-gray-300">
          We're building something amazing for you. This section will be available soon.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Back button */}
          <button 
            onClick={() => navigate(-1)}
            className="relative group px-6 py-3 bg-gray-800 text-white font-semibold rounded-full overflow-hidden shadow-lg"
            type="button"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-gray-800 to-gray-700 rounded-full shadow-md"></span>
            <span className="absolute inset-0 w-full h-full bg-white/5 rounded-full blur-[2px]"></span>
            <span className="absolute inset-0 w-full h-full bg-gray-800 rounded-full transform transition-transform group-hover:scale-105"></span>
            <span className="relative flex items-center justify-center">
              <ChevronLeft className="mr-2" size={18} /> Go Back
            </span>
          </button>
          
          {/* Home button */}
          <button 
            onClick={() => navigate('/')}
            className="relative group px-6 py-3 bg-blue-600 text-white font-semibold rounded-full overflow-hidden shadow-lg"
            type="button"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full shadow-md"></span>
            <span className="absolute inset-0 w-full h-full bg-white/15 rounded-full blur-[2px]"></span>
            <span className="absolute inset-0 w-full h-full bg-blue-600 rounded-full transform transition-transform group-hover:scale-105"></span>
            <span className="relative flex items-center justify-center">
              Return to Home <ArrowRight className="ml-2" size={18} />
            </span>
          </button>
        </div>
        
        {/* Feature preview */}
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all duration-300 mt-10">
          <h3 className="text-xl font-bold mb-2 text-white">Coming in this section</h3>
          <p className="text-gray-300 mb-4">
            We're working on bringing you advanced analytics and visualizations for your video emotion data.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-700 bg-opacity-50 p-2 rounded-lg text-blue-300">Interactive Charts</div>
            <div className="bg-gray-700 bg-opacity-50 p-2 rounded-lg text-blue-300">Demographic Analysis</div>
            <div className="bg-gray-700 bg-opacity-50 p-2 rounded-lg text-blue-300">Emotion Timeline</div>
          </div>
        </div>
      </div>
    </div>
  );
};
PageUnderConstruction.propTypes = {
  pageName: PropTypes.string,
};

export default PageUnderConstruction;
