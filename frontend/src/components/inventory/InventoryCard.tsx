import React from "react";
import type { InventoryItem } from "../../types";

interface Props {
  item: InventoryItem;
}

const InventoryCard: React.FC<Props> = ({ item }) => {
  const percentage = (item.current / item.total) * 100;

  return (
    <div className="flex-1 min-w-[200px] bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center`}
        >
          {item.icon}
        </div>
        <span className="text-2xl font-bold text-gray-900">{item.current}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">{item.name}</h3>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`${item.color} h-2 rounded-full transition-all duration-500 ease-in-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        Available: {item.current}/{item.total}
      </p>
    </div>
  );
};

export default InventoryCard;
