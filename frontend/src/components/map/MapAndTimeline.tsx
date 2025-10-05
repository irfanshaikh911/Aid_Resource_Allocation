import React from "react";
import { MapPin, Clock } from "lucide-react";

interface TimelineEvent {
  id: string;
  time: string;
  description: string;
}

interface MapAndTimelineProps {
  location?: string;
  events?: TimelineEvent[];
}

const MapAndTimeline: React.FC<MapAndTimelineProps> = ({
  location = "No location specified",
  events = [],
}) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white space-y-4">
      <div className="flex items-center space-x-2">
        <MapPin className="text-blue-500 w-5 h-5" />
        <span className="font-semibold">{location}</span>
      </div>

      <div className="border-t pt-3 space-y-2">
        {events.map((event) => (
          <div key={event.id} className="flex items-start space-x-2">
            <Clock className="text-gray-500 w-4 h-4 mt-1" />
            <div>
              <p className="text-sm font-medium">{event.time}</p>
              <p className="text-sm text-gray-600">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapAndTimeline;
