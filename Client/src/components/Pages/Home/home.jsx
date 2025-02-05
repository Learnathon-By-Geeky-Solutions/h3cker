import React from 'react';
import NaviagationBar from "../../Shared/Navbar/Navbar";
import MainFooter from '../../Shared/Footer/Footer';
import VideoCard from '../../Shared/VideoCard/VideoCard';

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <NaviagationBar />
      <div className="flex-grow"> 
        <div className="bg-desaturated-blue text-white text-center font-semibold text-xl p-10">
          Advertisements
        </div>
        <div className="bg-white text-black text-center font-semibold text-xl p-12">
          <p>Ad Videos</p>
        </div>
        <div className="flex justify-center space-x-5 p-10">
          <VideoCard />
          <VideoCard />
          <VideoCard />
        </div>
      </div>
      <MainFooter />
    </div>
  );
};

export default Home;