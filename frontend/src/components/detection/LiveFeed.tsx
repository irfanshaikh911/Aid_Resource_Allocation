import React, { useRef } from "react";
import testVideo from "../../assets/test_video.webm";

const LiveFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold bg-black/70 text-white px-3 py-1 rounded-lg">Live Drone Feed</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live Feed</span>
        </div>
      </div>

      <div className="relative w-full h-[300px] bg-gray-900">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={testVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
          Live Camera Feed
        </div> */}
      </div>
    </div>
  );
};

export default LiveFeed;
