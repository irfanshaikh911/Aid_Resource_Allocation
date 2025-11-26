import React, { useState, useEffect } from "react";
import {
  Bell,
  Shield,
  Sliders,
  Map,
  Database,
  Wifi,
  RefreshCcw,
  Monitor,
  CloudUpload,
  FileDown,
  Check,
  X,
} from "lucide-react";

const Settings = () => {
  // Load preferences from localStorage on mount
  const [notifications, setNotifications] = useState(() => 
    localStorage.getItem("notifications") === "true"
  );
  const [showCoordinates, setShowCoordinates] = useState(() => 
    localStorage.getItem("showCoordinates") === "true"
  );
  const [theme, setTheme] = useState(() => 
    localStorage.getItem("theme") || "light"
  );
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem("geminiApiKey") || ""
  );
  const [uiScale, setUiScale] = useState(() => 
    localStorage.getItem("uiScale") || "normal"
  );
  const [mapType, setMapType] = useState(() => 
    localStorage.getItem("mapType") || "osm"
  );
  const [aiModel, setAiModel] = useState(() => 
    localStorage.getItem("aiModel") || "gemini-pro"
  );
  
  const [saveStatus, setSaveStatus] = useState("");
  const [apiStatus, setApiStatus] = useState("");

  // Apply theme changes
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.style.backgroundColor = "#1f2937";
      document.body.style.color = "#f9fafb";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "#f9fafb";
      document.body.style.color = "#111827";
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Save all other preferences
  useEffect(() => {
    localStorage.setItem("notifications", notifications);
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("showCoordinates", showCoordinates);
  }, [showCoordinates]);

  useEffect(() => {
    localStorage.setItem("uiScale", uiScale);
    const root = document.documentElement;
    if (uiScale === "small") root.style.fontSize = "14px";
    else if (uiScale === "large") root.style.fontSize = "18px";
    else root.style.fontSize = "16px";
  }, [uiScale]);

  useEffect(() => {
    localStorage.setItem("mapType", mapType);
  }, [mapType]);

  useEffect(() => {
    localStorage.setItem("aiModel", aiModel);
  }, [aiModel]);

  // Save API Key
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("geminiApiKey", apiKey);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(""), 3000);
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  // Test API Connectivity
  const handleTestConnectivity = async () => {
    setApiStatus("testing");
    try {
      const response = await fetch("http://localhost:5000/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusters: [{ id: 1, people: 50 }],
          inventory: [{ name: "Test", current: 10, total: 100 }],
        }),
      });

      if (response.ok) {
        setApiStatus("success");
      } else {
        setApiStatus("error");
      }
    } catch (error) {
      setApiStatus("error");
    }
    setTimeout(() => setApiStatus(""), 5000);
  };

  // Export Data as CSV
  const handleExportData = () => {
    const data = {
      settings: {
        theme,
        notifications,
        showCoordinates,
        uiScale,
        mapType,
        aiModel,
      },
      exportDate: new Date().toISOString(),
    };

    const csv = "Setting,Value\n" + Object.entries(data.settings)
      .map(([key, value]) => `${key},${value}`)
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `davi-settings-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Backup Data
  const handleBackupData = () => {
    const backup = {
      settings: {
        theme,
        notifications,
        showCoordinates,
        uiScale,
        mapType,
        aiModel,
        apiKey: apiKey ? "***HIDDEN***" : "",
      },
      backupDate: new Date().toISOString(),
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `davi-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear Local Storage
  const handleClearStorage = () => {
    if (confirm("Are you sure? This will reset all settings and data.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Restart UI
  const handleRestartUI = () => {
    window.location.reload();
  };

  // Run Diagnostics
  const handleDiagnostics = () => {
    const diagnostics = {
      localStorage: !!localStorage,
      apiKeySet: !!apiKey,
      theme,
      browserSupport: {
        fetch: typeof fetch !== "undefined",
        localStorage: typeof localStorage !== "undefined",
      },
    };

    alert(
      `📊 System Diagnostics:\n\n` +
      `✅ LocalStorage: ${diagnostics.localStorage ? "Available" : "Not Available"}\n` +
      `${diagnostics.apiKeySet ? "✅" : "⚠️"} API Key: ${diagnostics.apiKeySet ? "Configured" : "Not Set"}\n` +
      `✅ Theme: ${diagnostics.theme}\n` +
      `✅ Fetch API: ${diagnostics.browserSupport.fetch ? "Supported" : "Not Supported"}\n`
    );
  };

  return (
    <div className="p-8 space-y-12 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">⚙️ Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage application preferences, AI model behavior, map settings, and privacy options.
        </p>
      </div>

      {/* GENERAL */}
      <div className="bg-white shadow-xl rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" /> General Preferences
        </h2>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-gray-700">Theme</span>
            <p className="text-sm text-gray-500">Change application appearance</p>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="border rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="light">🌤️ Light</option>
            <option value="dark">🌙 Dark</option>
            <option value="system">💻 System Default</option>
          </select>
        </div>

        {/* UI Scale */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-gray-700">UI Scale</span>
            <p className="text-sm text-gray-500">Adjust interface size</p>
          </div>
          <select
            value={uiScale}
            onChange={(e) => setUiScale(e.target.value)}
            className="border rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="small">Small (14px)</option>
            <option value="normal">Normal (16px)</option>
            <option value="large">Large (18px)</option>
          </select>
        </div>

        {/* Show Coordinates */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-gray-700">Show Exact Coordinates</span>
            <p className="text-sm text-gray-500">Display lat/long on map</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showCoordinates}
              onChange={() => setShowCoordinates(!showCoordinates)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div className="bg-white shadow-xl rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-yellow-500" /> Notifications
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-gray-700">Enable All Alerts</span>
            <p className="text-sm text-gray-500">AI alerts, shortages, flood warnings</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
          </label>
        </div>
      </div>

      {/* AI SECTION */}
      <div className="bg-white shadow-xl rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Monitor className="w-5 h-5 text-indigo-600" /> AI Model Settings
        </h2>

        {/* Model Selection */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-gray-700">AI Model</span>
            <p className="text-sm text-gray-500">Select analysis model</p>
          </div>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="border rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="gemini-pro">Google Gemini Pro</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="font-medium text-gray-700 block mb-2">Gemini API Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="flex-1 border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleSaveApiKey}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              {saveStatus === "success" && <Check className="w-4 h-4" />}
              {saveStatus === "error" && <X className="w-4 h-4" />}
              Save
            </button>
          </div>
          {saveStatus === "success" && (
            <p className="text-green-600 text-sm mt-2">✅ API Key saved successfully!</p>
          )}
          {saveStatus === "error" && (
            <p className="text-red-600 text-sm mt-2">❌ Please enter a valid API key</p>
          )}
        </div>
      </div>

      {/* MAP SETTINGS */}
      <div className="bg-white shadow-xl rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Map className="w-5 h-5 text-green-600" /> Map Settings
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-gray-700">Map Theme</span>
            <p className="text-sm text-gray-500">Choose map visualization style</p>
          </div>
          <select
            value={mapType}
            onChange={(e) => setMapType(e.target.value)}
            className="border rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="osm">🗺️ OpenStreetMap</option>
            <option value="dark">🌙 Dark Mode</option>
            <option value="satellite">🛰️ Satellite</option>
            <option value="terrain">⛰️ Terrain</option>
          </select>
        </div>
      </div>

      {/* EXPORT & BACKUP */}
      <div className="bg-white shadow-xl rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-600" /> Data Management
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleBackupData}
            className="flex items-center justify-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <CloudUpload className="w-4" /> Backup Settings
          </button>

          <button 
            onClick={handleExportData}
            className="flex items-center justify-center gap-2 bg-gray-700 text-white px-5 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FileDown className="w-4" /> Export as CSV
          </button>
        </div>
      </div>

      {/* PRIVACY */}
      <div className="bg-white shadow-xl rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" /> Privacy & Security
        </h2>

        <button 
          onClick={handleClearStorage}
          className="bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700 transition-colors w-full md:w-auto"
        >
          🗑️ Clear All Data & Reset
        </button>
        <p className="text-sm text-gray-500">This will delete all saved preferences and reload the app</p>
      </div>

      {/* CONNECTIVITY */}
      <div className="bg-white shadow-xl rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wifi className="w-5 h-5 text-green-500" /> Connectivity
        </h2>

        <button 
          onClick={handleTestConnectivity}
          disabled={apiStatus === "testing"}
          className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {apiStatus === "testing" ? "⏳ Testing..." : "🔍 Test API Connection"}
        </button>

        {apiStatus === "success" && (
          <p className="text-green-600 text-sm">✅ API is working correctly!</p>
        )}
        {apiStatus === "error" && (
          <p className="text-red-600 text-sm">❌ Connection failed. Check backend is running on port 5000.</p>
        )}
      </div>

      {/* SYSTEM */}
      <div className="bg-white shadow-xl rounded-xl p-6 space-y-6 mb-20">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <RefreshCcw className="w-5 h-5 text-gray-600" /> System & Diagnostics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleRestartUI}
            className="bg-gray-600 text-white px-5 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 Restart Application
          </button>

          <button 
            onClick={handleDiagnostics}
            className="bg-orange-600 text-white px-5 py-3 rounded-lg hover:bg-orange-700 transition-colors"
          >
            🏥 Run Health Check
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;