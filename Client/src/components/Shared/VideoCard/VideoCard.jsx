import { Button,Card } from "flowbite-react";
import React from "react";
const VideoCard = () => {
    return(
        <Card
      className="max-w-sm "
      imgAlt="Meaningful alt text for an image that is not purely decorative"
      imgSrc="https://i.postimg.cc/hvkXPNZX/overlord.jpg"
      
    >
      <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Noteworthy technology acquisitions 2021
      </h5>
      <p className="font-normal text-gray-700 dark:text-gray-400">
        Here are the biggest enterprise technology acquisitions of 2021 so far, in reverse chronological order.
      </p>
      <Button className="bg-custom-dark-blue">Watch</Button>
    </Card>
    )
};

export default VideoCard;