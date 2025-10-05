import React, { useRef, useEffect } from "react";
import type { DetectionData } from "../../types";
import { Users, MapPin, AlertTriangle, Heart } from "lucide-react";
import DronePlaceholder from "../../assets/test_video.webm";

const DroneDetection: React.FC<{ data: DetectionData }> = ({ data }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure video plays after component mounts
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.log("Video autoplay failed:", error);
      });
    }
  }, []);

  const severityColors = {
    Critical: "bg-red-100 text-red-700 border-red-200",
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Low: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Live Drone Detection
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live Feed</span>
        </div>
      </div>

      <div className="relative w-full h-[400px] rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          src={DronePlaceholder}
          autoPlay
          loop
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
          {data.timestamp}
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">People Detected</p>
              <p className="text-xl font-bold text-gray-900">
                {data.totalPeople}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">
                {data.location}
              </p>
              <p className="text-xs text-gray-400">{data.coordinates}</p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-xs text-gray-500">Severity Level</p>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  severityColors[data.severity]
                }`}
              >
                {data.severity}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-pink-600" />
            <div>
              <p className="text-xs text-gray-500">Vulnerable Groups</p>
              <p className="text-xl font-bold text-gray-900">
                {data.vulnerable}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DroneDetection;
