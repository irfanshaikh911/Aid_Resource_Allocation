import React, { useState, useEffect, useRef } from "react";
import Header from "../components/layout/Header";
import InventoryCard from "../components/inventory/InventoryCard";
import DroneDetection from "../components/detection/DroneDetection";
import AllocationRecommendation from "../components/recommendation/AllocationRecommendation";
import MapAndTimeline from "../components/map/MapAndTimeline";
import AddInventoryDialog from "../components/inventory/AddInventoryDialog";
import fs from "fs/promises";
import path from "path";
import {
  Package,
  Heart,
  Anchor,
  Layers,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type {
  InventoryItem,
  DetectionData,
  AllocationRecommendationType,
  TimelineEvent,
} from "../types";
import type { DroneData } from "../types";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import LiveFeed from "../components/detection/LiveFeed";

const FloodReliefDashboard: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: "1",
      name: "Food Kits",
      icon: <Package className="w-5 h-5 text-blue-600" />,
      current: 245,
      total: 500,
      color: "bg-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      id: "2",
      name: "Medical Kits",
      icon: <Heart className="w-5 h-5 text-red-600" />,
      current: 89,
      total: 200,
      color: "bg-red-600",
      bgColor: "bg-red-100",
    },
    {
      id: "3",
      name: "Rescue Boats",
      icon: <Anchor className="w-5 h-5 text-green-600" />,
      current: 12,
      total: 25,
      color: "bg-green-600",
      bgColor: "bg-green-100",
    },
    {
      id: "4",
      name: "Blankets",
      icon: <Layers className="w-5 h-5 text-purple-600" />,
      current: 367,
      total: 600,
      color: "bg-purple-600",
      bgColor: "bg-purple-100",
    },
  ]);

  const [detectionData, setDetectionData] = useState<DetectionData>({
    totalPeople: 47,
    location: "Riverside Colony, Sector 12",
    severity: "Critical",
    vulnerable: 12,
    coordinates: "18.5204° N, 73.8567° E",
    timestamp: "2:34 PM, Today",
  });

  const [recommendation, setRecommendation] =
    useState<AllocationRecommendationType>({
      id: "1",
      location: "Riverside Colony, Sector 12",
      foodKits: 50,
      medicalKits: 15,
      rescueBoats: 3,
      blankets: 60,
      priority: "Critical",
      reason:
        "High concentration of stranded individuals detected with 12 vulnerable people including children and elderly. Water levels rising rapidly. Immediate evacuation and medical support required.",
      timestamp: "2 minutes ago",
    });

  const [timelineEvents] = useState<TimelineEvent[]>([
    {
      id: "1",
      time: "2:34 PM",
      description: "Flood alert issued for Riverside Colony",
    },
    {
      id: "2",
      time: "2:45 PM",
      description: "Rescue team dispatched to affected area",
    },
  ]);

  const [currentView, setCurrentView] = useState<"dashboard" | "map">(
    "dashboard"
  );
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [mapMarkers, setMapMarkers] = useState<
    Array<{
      id: string;
      position: [number, number];
      people: number;
    }>
  >([]);
  const [showInventory, setShowInventory] = useState(true);

  // Custom marker icon
  const icon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  // Load all markers when component mounts
  useEffect(() => {
    const loadAllMarkers = async () => {
      try {
        const response = await fetch("/src/assets/drone_data2.csv");
        const text = await response.text();
        const rows = text
          .split("\n")
          .filter((row) => row.trim())
          .slice(1); // Skip header

        const markers = rows
          .map((row) => {
            const [Cluster_ID, No_of_People, Latitude, Longitude] = row
              .split(",")
              .map((item) => item.trim());
            const lat = parseFloat(Latitude);
            const lng = parseFloat(Longitude);

            if (isNaN(lat) || isNaN(lng)) {
              console.error(`Invalid coordinates for Cluster ${Cluster_ID}`);
              return null;
            }

            return {
              id: Cluster_ID,
              position: [lat, lng] as [number, number],
              people: parseInt(No_of_People) || 0,
            };
          })
          .filter(
            (marker): marker is NonNullable<typeof marker> => marker !== null
          );

        setMapMarkers(markers);
      } catch (error) {
        console.error("Error loading markers:", error);
      }
    };

    loadAllMarkers();
  }, []);

  const handleAddInventory = async (itemName: string, quantity: number) => {
    // Update inventory state
    const updatedInventory = inventory.map((item) => {
      if (item.name === itemName) {
        return {
          ...item,
          current: item.current + quantity,
        };
      }
      return item;
    });
    setInventory(updatedInventory);

    // Update CSV file
    try {
      const csvPath = path.join(__dirname, "../assets/inventory_data.csv");
      const csvData = await fs.readFile(csvPath, "utf-8");
      const rows = csvData.split("\n");
      const updatedRows = rows.map((row) => {
        const [resource, qty, lat, lng] = row.split(",");
        if (resource === itemName) {
          return `${resource},${parseInt(qty) + quantity},${lat},${lng}`;
        }
        return row;
      });
      await fs.writeFile(csvPath, updatedRows.join("\n"));
    } catch (error) {
      console.error("Error updating inventory:", error);
    }
  };

  const handleRecommendation = (data: DroneData) => {
    // Update recommendation state or trigger API call
    const newRecommendation: AllocationRecommendationType = {
      id: data.Cluster_ID,
      location: `${data.Latitude}, ${data.Longitude}`,
      foodKits: Math.ceil(data.No_of_People * 0.8),
      medicalKits: Math.ceil(data.No_of_People * 0.3),
      rescueBoats: Math.ceil(data.No_of_People / 20),
      blankets: Math.ceil(data.No_of_People * 1.2),
      priority: data.No_of_People > 50 ? "Critical" : "Medium",
      reason: `${
        data.No_of_People
      } people detected at ${data.Distance_from_Inventory_km.toFixed(
        2
      )}km from inventory.`,
      timestamp: new Date().toLocaleString(),
    };

    // Update your recommendation state here
    setRecommendation(newRecommendation);
  };

  // Handle locate click
  const handleLocate = (data: DroneData) => {
    if (isValidCoordinates(data.Latitude, data.Longitude)) {
      setActiveMarkerId(data.Cluster_ID);
      // Update or add marker if not exists
      setMapMarkers((prev) => {
        const exists = prev.some((m) => m.id === data.Cluster_ID);
        if (!exists) {
          return [
            ...prev,
            {
              id: data.Cluster_ID,
              position: [data.Latitude, data.Longitude],
              people: data.No_of_People,
            },
          ];
        }
        return prev;
      });

      // Scroll to map section
      mapRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Update detection data to show details
      setDetectionData({
        totalPeople: data.No_of_People,
        location: `Cluster ${data.Cluster_ID}`,
        severity: data.No_of_People > 50 ? "Critical" : "Medium",
        vulnerable: Math.floor(data.No_of_People * 0.25), // Assuming 25% are vulnerable
        coordinates: `${data.Latitude}° N, ${data.Longitude}° E`,
        timestamp: new Date().toLocaleString(),
      });
    }
  };

  // Coordinate validation helper
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

  // Define drone location constant
  const DRONE_LOCATION: [number, number] = [18.52274, 73.85353];

  // Create a combined map view that includes both drone and cluster markers
  const renderFullMap = () => (
    <MapContainer
      center={DRONE_LOCATION}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
      />
      {/* Drone Base Station Marker */}
      <Marker
        position={DRONE_LOCATION}
        icon={L.divIcon({
          className: "drone-marker",
          html: "<span>🚁</span>",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })}
      >
        <Popup>
          <div className="text-sm font-medium">
            <p>Drone Base Station</p>
            <p>PMC Bhavan</p>
          </div>
        </Popup>
      </Marker>

      {/* Cluster Markers */}
      {mapMarkers.map((marker) => (
        <Marker key={marker.id} position={marker.position} icon={icon}>
          <Popup>
            <b>Cluster {marker.id}</b>
            <br />
            People affected: {marker.people}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );

  const renderContent = () => {
    if (currentView === "map") {
      return (
        <div className="flex-1">
          <div className="h-[calc(100vh-64px)] w-full">{renderFullMap()}</div>
        </div>
      );
    }

    return (
      <>
        {/* Horizontal Inventory Cards with Toggle */}
        <div className="w-full bg-white border-b border-gray-200">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Resource Inventory
              </h2>
              <button
                onClick={() => setShowInventory(!showInventory)}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                {showInventory ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-2"
            >
              <span>+ Add Resources</span>
            </button>
          </div>

          {/* Collapsible inventory section */}
          {showInventory && (
            <div className="px-4 pb-4">
              <div className="flex gap-4 overflow-x-auto no-scrollbar">
                {inventory.map((item) => (
                  <div key={item.id} className="flex-none w-[280px]">
                    <InventoryCard item={item} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4 gap-4">
          <div className="grid grid-cols-[1fr,400px] gap-4">
            <DroneDetection
              onRecommend={handleRecommendation}
              onLocate={handleLocate}
            />
            <div className="space-y-4">
              <LiveFeed />
              <AllocationRecommendation
                recommendation={recommendation}
                onApprove={() => console.log("Approved")}
                onReject={() => console.log("Rejected")}
              />
            </div>
          </div>
          <div className="mt-4" ref={mapRef}>
            <MapAndTimeline
              location={detectionData.location}
              events={timelineEvents}
              markers={mapMarkers}
              activeMarkerId={activeMarkerId}
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      <div className="flex flex-col">{renderContent()}</div>
      <AddInventoryDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddInventory}
      />
    </div>
  );
};

export default FloodReliefDashboard;
