import React, { useState } from "react";
import Header from "../components/layout/Header";
import InventoryCard from "../components/inventory/InventoryCard";
import DroneDetection from "../components/detection/DroneDetection";
import AllocationRecommendation from "../components/recommendation/AllocationRecommendation";
import MapAndTimeline from "../components/map/MapAndTimeline";
import AddInventoryDialog from "../components/inventory/AddInventoryDialog";
import fs from "fs/promises";
import path from "path";
import { Package, Heart, Anchor, Layers } from "lucide-react";
import type {
  InventoryItem,
  DetectionData,
  AllocationRecommendationType,
  TimelineEvent,
} from "../types";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const FloodReliefDashboard: React.FC = () => {
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

  const [detectionData] = useState<DetectionData>({
    totalPeople: 47,
    location: "Riverside Colony, Sector 12",
    severity: "Critical",
    vulnerable: 12,
    coordinates: "18.5204° N, 73.8567° E",
    timestamp: "2:34 PM, Today",
  });

  const [recommendation] = useState<AllocationRecommendationType>({
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

  // Custom marker icon
  const icon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

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

  const renderContent = () => {
    if (currentView === "map") {
      return (
        <div className="flex-1 p-4">
          <div className="h-[calc(100vh-100px)] w-full rounded-xl overflow-hidden border border-gray-200 bg-white">
            <MapContainer
              center={[18.5204, 73.8567]}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                // @ts-ignore
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
              />
              <Marker position={[18.5204, 73.8567]} icon={icon}>
                <Popup>
                  <b>{detectionData.location}</b>
                  <br />
                  Current Drone Location
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      );
    }

    return (
      <>
        <aside className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Resource Inventory
            </h2>
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
            >
              + Add
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {inventory.map((item) => (
              <InventoryCard key={item.id} item={item} />
            ))}
          </div>
        </aside>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex gap-4 p-4">
            <div className="flex-1">
              <DroneDetection data={detectionData} />
            </div>
            <div className="w-96">
              <AllocationRecommendation
                recommendation={recommendation}
                onApprove={() => console.log("Approved")}
                onReject={() => console.log("Rejected")}
              />
            </div>
          </div>
          <div className="p-4 pt-0">
            <MapAndTimeline
              location={detectionData.location}
              events={timelineEvents}
            />
          </div>
        </div>
        <AddInventoryDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onAdd={handleAddInventory}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onViewChange={setCurrentView} currentView={currentView} />
      <div className="flex">{renderContent()}</div>
    </div>
  );
};

export default FloodReliefDashboard;
