import React from 'react'
import NaviagationBar from "../../Shared/Navbar/Navbar";
import MainFooter from '../../Shared/Footer/Footer';
import VideoCard from '../../Shared/VideoCard/VideoCard';
const home = () => {
  return (
    <div >
      <NaviagationBar/>
      <div className="bg-desaturated-blue text-white text-center font-semibold text-xl  p-10">
      Advertisements
    </div>    
    <div className='bg-white text-black text-center  font-semibold text-xl  p-12'>
      <p>Ad Videos</p>
    </div>
    <div className='flex justify-center space-x-5 p-10'>
          <VideoCard/>
          <VideoCard/>
          <VideoCard/>
        </div>
    <div className='bg-white font-semibold '></div>
    <MainFooter/>
    </div>
  )
}

export default home