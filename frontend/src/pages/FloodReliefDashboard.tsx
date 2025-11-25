import React, { useState, useEffect, useRef } from "react";
import Header from "../components/layout/Header";
import InventoryCard from "../components/inventory/InventoryCard";
import DroneDetection from "../components/detection/DroneDetection";
import AllocationRecommendation from "../components/recommendation/AllocationRecommendation";
import MapAndTimeline from "../components/map/MapAndTimeline";
import AddInventoryDialog from "../components/inventory/AddInventoryDialog";
import Analysis from "../components/analysis/Analysis"; // ⭐ NEW IMPORT

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

  const [currentView, setCurrentView] =
    useState<"dashboard" | "map" | "analysis">("dashboard");

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
        "High concentration of stranded individuals detected with 12 vulnerable people.",
      timestamp: "2 minutes ago",
    });

  const [timelineEvents] = useState<TimelineEvent[]>([
    { id: "1", time: "2:34 PM", description: "Flood alert issued" },
    { id: "2", time: "2:45 PM", description: "Rescue team dispatched" },
  ]);

  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  const [mapMarkers, setMapMarkers] = useState<
    Array<{ id: string; position: [number, number]; people: number }>
  >([]);

  const [showInventory, setShowInventory] = useState(true);

  const icon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  // Load Markers
  useEffect(() => {
    const loadAllMarkers = async () => {
      try {
        const response = await fetch("/src/assets/drone_data2.csv");
        const text = await response.text();
        const rows = text.split("\n").slice(1);

        const markers = rows
          .map((row) => {
            const [Cluster_ID, No_of_People, Latitude, Longitude] =
              row.split(",").map((v) => v.trim());

            return {
              id: Cluster_ID,
              position: [parseFloat(Latitude), parseFloat(Longitude)],
              people: parseInt(No_of_People),
            };
          })
          .filter((m) => !isNaN(m.position[0]) && !isNaN(m.position[1]));

        setMapMarkers(markers);
      } catch (err) {
        console.error("Error loading markers:", err);
      }
    };
    loadAllMarkers();
  }, []);

  const DRONE_LOCATION: [number, number] = [18.52274, 73.85353];

  const renderFullMap = () => (
    <MapContainer center={DRONE_LOCATION} zoom={12} style={{ height: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <Marker
        position={DRONE_LOCATION}
        icon={L.divIcon({
          html: "<span>🚁</span>",
          className: "drone-marker",
          iconSize: [32, 32],
        })}
      />

      {mapMarkers.map((marker) => (
        <Marker key={marker.id} position={marker.position} icon={icon}>
          <Popup>
            Cluster {marker.id}
            <br />
            People: {marker.people}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );

  const renderContent = () => {
    if (currentView === "map") {
      return (
        <div className="flex-1 h-[calc(100vh-64px)]">{renderFullMap()}</div>
      );
    }

    // ⭐ ANALYSIS VIEW
    if (currentView === "analysis") {
      return (
        <div className="flex-1 min-h-[calc(100vh-64px)]">
          <Analysis 
            inventory={inventory} 
            clusters={mapMarkers} 
          />
        </div>
      );
    }


    // ⭐ DEFAULT DASHBOARD VIEW
    return (
      <>
        {/* Inventory Bar */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Resource Inventory</h2>

            <button
              onClick={() => setShowInventory(!showInventory)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              {showInventory ? (
                <>
                  <ChevronUp className="w-4" /> Hide
                </>
              ) : (
                <>
                  <ChevronDown className="w-4" /> Show
                </>
              )}
            </button>
          </div>

          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
          >
            + Add Resources
          </button>
        </div>

        {showInventory && (
          <div className="p-4 flex gap-4 overflow-x-auto">
            {inventory.map((item) => (
              <div key={item.id} className="w-[260px] flex-none">
                <InventoryCard item={item} />
              </div>
            ))}
          </div>
        )}

        {/* Main Grid */}
        <div className="p-4 grid grid-cols-[1fr,400px] gap-4">
          <DroneDetection />
          <div className="space-y-4">
            <LiveFeed />
            <AllocationRecommendation recommendation={recommendation} />
          </div>
        </div>

        {/* Timeline + Map Section */}
        <div className="p-4">
          <MapAndTimeline
            markers={mapMarkers}
            location={detectionData.location}
            activeMarkerId={activeMarkerId}
            events={timelineEvents}
          />
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      <div>{renderContent()}</div>

      <AddInventoryDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={() => {}}
      />
    </div>
  );
};

export default FloodReliefDashboard;
