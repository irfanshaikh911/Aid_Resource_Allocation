import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  PieChart,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#8b5cf6", "#f97316", "#14b8a6"];

const Analysis = ({ inventory = [], clusters = [] }) => {
  // -------------------------------
  // CHART DATA
  // -------------------------------

  const peopleDensityData = clusters.slice(0, 6).map((c) => ({
    cluster: `C${c.id}`,
    people: c.people,
  }));

  const inventoryPie = inventory.map((i) => ({
    name: i.name,
    value: i.current,
  }));

  const lineData = clusters.slice(0, 6).map((c, index) => ({
    time: `T${index + 1}`,
    rescue: Math.ceil(c.people / 20),
  }));

  // Heatmap Risk Grid
  const heatmapGrid = clusters.slice(0, 8).map((c) => ({
    id: c.id,
    people: c.people,
    risk: c.people > 80 ? "Severe" : c.people > 50 ? "High" : c.people > 25 ? "Medium" : "Low",
  }));

  // -------------------------------
  // ADVANCED ANALYTICS TABLE DATA
  // -------------------------------

  // 1️⃣ INVENTORY HEALTH TABLE
  const inventoryHealth = inventory.map((i) => ({
    name: i.name,
    current: i.current,
    total: i.total,
    percent: ((i.current / i.total) * 100).toFixed(1),
    status:
      i.current < i.total * 0.25
        ? "Critical"
        : i.current < i.total * 0.5
        ? "Low"
        : "Healthy",
  }));

  // 2️⃣ CLUSTER PRIORITY TABLE
  const clusterPriority = clusters.map((c) => ({
    id: c.id,
    people: c.people,
    priority:
      c.people > 80
        ? "🚨 Severe"
        : c.people > 50
        ? "⚠️ High"
        : c.people > 25
        ? "🟡 Medium"
        : "🟢 Low",
  }));

  // 3️⃣ AI Allocation Need (based on your logic)
  const allocationTable = clusters.map((c) => ({
    id: c.id,
    people: c.people,
    food: Math.ceil(c.people * 0.8),
    medical: Math.ceil(c.people * 0.3),
    boats: Math.ceil(c.people / 20),
    blankets: Math.ceil(c.people * 1.2),
  }));

  // 4️⃣ Supply Shortage Table
  const supplyShortage = inventory.map((i) => ({
    name: i.name,
    available: i.current,
    needed: clusters.reduce((sum, c) => {
      if (i.name.includes("Food")) return sum + Math.ceil(c.people * 0.8);
      if (i.name.includes("Medical")) return sum + Math.ceil(c.people * 0.3);
      if (i.name.includes("Boat")) return sum + Math.ceil(c.people / 20);
      if (i.name.includes("Blanket")) return sum + Math.ceil(c.people * 1.2);
      return sum;
    }, 0),
  }));

  // 5️⃣ Evacuation Priority Table
  const evacTable = clusters
    .map((c) => ({
      id: c.id,
      people: c.people,
      evacuation:
        c.people > 100
          ? "Immediate Evacuation Needed"
          : c.people > 60
          ? "High Priority"
          : c.people > 30
          ? "Medium Priority"
          : "Low Priority",
    }))
    .slice(0, 8);

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">📊 Advanced Disaster Analytics</h1>

      {/* ------------------------- */}
      {/* CHARTS SECTION */}
      {/* ------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* People Density Bar Chart */}
        <div className="bg-white shadow-lg rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-2">People Density per Cluster</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={peopleDensityData}>
              <XAxis dataKey="cluster" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="people" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Pie Chart */}
        <div className="bg-white shadow-lg rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-2">Inventory Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={inventoryPie} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                {inventoryPie.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Rescue Need Trend */}
        <div className="bg-white shadow-lg rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-2">Rescue Boats Needed Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="rescue" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Heatmap */}
        <div className="bg-white shadow-lg rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-2">Cluster Risk Heat Levels</h3>

          <div className="grid grid-cols-4 gap-3 mt-4">
            {heatmapGrid.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-lg text-center text-white font-medium ${
                  c.risk === "Severe"
                    ? "bg-red-700"
                    : c.risk === "High"
                    ? "bg-red-500"
                    : c.risk === "Medium"
                    ? "bg-yellow-500"
                    : "bg-green-600"
                }`}
              >
                C{c.id}
                <br />
                <span className="text-sm opacity-90">{c.risk}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------- */}
      {/* ANALYTICS TABLES SECTION  */}
      {/* ------------------------- */}

      {/* 1️⃣ Inventory Health Table */}
      <div className="bg-white shadow-xl rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">🔋 Inventory Health</h3>

        <table className="w-full text-left">
          <thead className="border-b">
            <tr>
              <th className="p-2">Resource</th>
              <th className="p-2">Current</th>
              <th className="p-2">Capacity</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventoryHealth.map((i) => (
              <tr key={i.name} className="border-b">
                <td className="p-2">{i.name}</td>
                <td className="p-2">{i.current}</td>
                <td className="p-2">{i.total}</td>
                <td
                  className={`p-2 font-semibold ${
                    i.status === "Critical"
                      ? "text-red-600"
                      : i.status === "Low"
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {i.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2️⃣ Cluster Priority Table */}
      <div className="bg-white shadow-xl rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">🚨 Cluster Severity Ranking</h3>

        <table className="w-full text-left">
          <thead className="border-b">
            <tr>
              <th className="p-2">Cluster</th>
              <th className="p-2">People</th>
              <th className="p-2">Priority</th>
            </tr>
          </thead>
          <tbody>
            {clusterPriority.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-2">C{c.id}</td>
                <td className="p-2">{c.people}</td>
                <td className="p-2">{c.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3️⃣ Resource Allocation Table */}
      <div className="bg-white shadow-xl rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">📦 AI Resource Allocation Suggestion</h3>

        <table className="w-full text-left">
          <thead className="border-b">
            <tr>
              <th className="p-2">Cluster</th>
              <th className="p-2">People</th>
              <th className="p-2">Food Kits</th>
              <th className="p-2">Medical Kits</th>
              <th className="p-2">Boats</th>
              <th className="p-2">Blankets</th>
            </tr>
          </thead>
          <tbody>
            {allocationTable.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-2">C{a.id}</td>
                <td className="p-2">{a.people}</td>
                <td className="p-2">{a.food}</td>
                <td className="p-2">{a.medical}</td>
                <td className="p-2">{a.boats}</td>
                <td className="p-2">{a.blankets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4️⃣ Supply Shortage */}
      <div className="bg-white shadow-xl rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">📉 Supply Shortage Analysis</h3>

        <table className="w-full text-left">
          <thead className="border-b">
            <tr>
              <th className="p-2">Resource</th>
              <th className="p-2">Available</th>
              <th className="p-2">Needed</th>
              <th className="p-2">Shortage</th>
            </tr>
          </thead>
          <tbody>
            {supplyShortage.map((s) => (
              <tr key={s.name} className="border-b">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.available}</td>
                <td className="p-2">{s.needed}</td>
                <td className="p-2 text-red-600 font-bold">
                  {s.needed - s.available > 0 ? s.needed - s.available : "OK"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5️⃣ Evacuation Priority */}
      <div className="bg-white shadow-xl rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">🚑 Evacuation Priority Table</h3>

        <table className="w-full text-left">
          <thead className="border-b">
            <tr>
              <th className="p-2">Cluster</th>
              <th className="p-2">People</th>
              <th className="p-2">Evacuation Priority</th>
            </tr>
          </thead>
          <tbody>
            {evacTable.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="p-2">C{e.id}</td>
                <td className="p-2">{e.people}</td>
                <td className="p-2">{e.evacuation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analysis;
