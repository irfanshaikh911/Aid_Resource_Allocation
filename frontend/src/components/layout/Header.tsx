import React from "react";
import {
  Droplets,
  Home,
  MapPin,
  BarChart3,
  Settings,
  Bell,
} from "lucide-react";
import dropletImage from '../../assets/Logo.png'; 

interface HeaderProps {
  currentView: "dashboard" | "map";
  onViewChange: (view: "dashboard" | "map") => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center">
            <img 
              src={dropletImage} 
              alt="Droplet icon" 
              className="w-12 h-12" 
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              DAVI-Vision Aid Allocation System
            </h1>
            <p className="text-sm text-gray-500">
              AI-Driven Resource Allocation System
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              currentView === "dashboard"
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => onViewChange("dashboard")}
          >
            <Home className="w-4 h-4" /> Dashboard
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              currentView === "map"
                ? "text-blue-600 bg-blue-50 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => onViewChange("map")}
          >
            <MapPin className="w-4 h-4" /> Map View
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
            <BarChart3 className="w-4 h-4" /> Analytics
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button className="relative p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
