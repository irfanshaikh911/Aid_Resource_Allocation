import React, { useEffect, useState, useRef } from "react";
import type { DroneData } from "../../types";
import { AlertCircle, ChevronDown, MapPin } from "lucide-react";

interface Props {
  onRecommend: (data: DroneData) => void;
  onLocate?: (data: DroneData) => void;
}

const DroneDetection: React.FC<Props> = ({ onRecommend, onLocate }) => {
  const [droneData, setDroneData] = useState<DroneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleItems, setVisibleItems] = useState(10);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchDroneData = async () => {
      try {
        const response = await fetch("/src/assets/drone_data2.csv");
        const text = await response.text();
        const rows = text
          .split("\n")
          .filter((row) => row.trim()) // Remove empty rows
          .slice(1); // Skip header row

        const parsed = rows
          .map((row) => {
            const [
              Cluster_ID,
              No_of_People,
              Latitude,
              Longitude,
              Distance_from_Inventory_km,
            ] = row.split(",").map((item) => item.trim());

            // Validate coordinates
            const lat = parseFloat(Latitude);
            const lng = parseFloat(Longitude);

            if (isNaN(lat) || isNaN(lng)) {
              console.error(`Invalid coordinates for Cluster ${Cluster_ID}`);
              return null;
            }

            return {
              Cluster_ID,
              No_of_People: parseInt(No_of_People) || 0,
              Latitude: lat,
              Longitude: lng,
              Distance_from_Inventory_km:
                parseFloat(Distance_from_Inventory_km) || 0,
            };
          })
          .filter((data): data is NonNullable<typeof data> => data !== null);

        setDroneData(parsed);
      } catch (error) {
        console.error("Error loading drone data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDroneData();
  }, []);

  const showMore = () => {
    setVisibleItems((prev) => Math.min(prev + 10, droneData.length));
  };

  // Handle locate click with validation
  const handleLocateClick = (data: DroneData) => {
    if (onLocate && isValidCoordinates(data.Latitude, data.Longitude)) {
      onLocate(data);
    } else {
      console.error(`Invalid coordinates for Cluster ${data.Cluster_ID}`);
    }
  };

  // Validate coordinates
  const isValidCoordinates = (lat: number, lng: number) => {
    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Live Detected Data
        </h2>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500" />
          <span className="text-sm text-gray-500">Real-time Updates</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">Cluster ID</th>
              <th className="px-4 py-3 font-medium">People</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Distance (km)</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center">
                  Loading data...
                </td>
              </tr>
            ) : (
              <>
                {droneData.slice(0, visibleItems).map((data) => (
                  <tr
                    key={data.Cluster_ID}
                    className="border-t border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{data.Cluster_ID}</td>
                    <td className="px-4 py-3">{data.No_of_People}</td>
                    <td className="px-4 py-3">
                      {data.Latitude.toFixed(6)}, {data.Longitude.toFixed(6)}
                    </td>
                    <td className="px-4 py-3">
                      {data.Distance_from_Inventory_km.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onRecommend(data)}
                          className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          Recommend
                        </button>
                        <button
                          onClick={() => handleLocateClick(data)}
                          className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center gap-1"
                        >
                          <MapPin className="w-4 h-4" />
                          Locate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleItems < droneData.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center">
                      <button
                        onClick={showMore}
                        className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <ChevronDown className="w-4 h-4" />
                        Show More
                      </button>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DroneDetection;
