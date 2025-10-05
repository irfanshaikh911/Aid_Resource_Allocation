import React, { useRef, useEffect } from "react";
import { MapPin, Clock } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Create custom marker icons
const clusterIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Alternative simple marker approach
const droneIcon = L.divIcon({
  className: "drone-marker",
  html: "🚁",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Define drone location constant
const DRONE_LOCATION: [number, number] = [18.52274, 73.85353]; // PMC Bhavan coordinates

// MapController component to handle zooming
const MapController: React.FC<{
  activeMarkerId: string | null;
  markers: Array<{
    id: string;
    position: [number, number];
  }>;
}> = ({ activeMarkerId, markers }) => {
  const map = useMap();

  useEffect(() => {
    if (activeMarkerId) {
      const marker = markers.find((m) => m.id === activeMarkerId);
      if (marker) {
        map.flyTo(marker.position, 15, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
      }
    }
  }, [activeMarkerId, markers, map]);

  return null;
};

interface TimelineEvent {
  id: string;
  time: string;
  description: string;
}

interface MapAndTimelineProps {
  location?: string;
  events?: TimelineEvent[];
  markers?: Array<{
    id: string;
    position: [number, number];
    people: number;
  }>;
  activeMarkerId?: string | null;
}

const MapAndTimeline: React.FC<MapAndTimelineProps> = ({
  location = "No location specified",
  events = [],
  markers = [],
  activeMarkerId,
}) => {
  const activeMarker = markers.find((m) => m.id === activeMarkerId);

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white space-y-4">
      <div className="flex items-center space-x-2">
        <MapPin className="text-blue-500 w-5 h-5" />
        <span className="font-semibold">{location}</span>
      </div>

      <div className="h-[400px] rounded-lg overflow-hidden">
        <MapContainer
          center={DRONE_LOCATION}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {/* Add Drone Marker */}
          <Marker position={DRONE_LOCATION} icon={droneIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Drone Base Station</p>
                <p>PMC Bhavan</p>
              </div>
            </Popup>
          </Marker>

          {/* Cluster Markers */}
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={marker.position}
              icon={clusterIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Cluster {marker.id}</p>
                  <p>People affected: {marker.people}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {activeMarker && (
            <MapController
              activeMarkerId={activeMarkerId ?? null}
              markers={markers}
            />
          )}
        </MapContainer>
      </div>

      {/* Timeline Section */}
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
