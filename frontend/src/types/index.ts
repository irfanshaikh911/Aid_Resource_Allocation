// Inventory items
export interface InventoryItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  current: number;
  total: number;
  color: string;
  bgColor: string;
}

// Allocation recommendation type (renamed to avoid conflicts)
export interface AllocationRecommendationType {
  id: string;
  location: string;
  foodKits: number;
  medicalKits: number;
  rescueBoats: number;
  blankets: number;
  priority: 'Critical' | 'High' | 'Medium';
  reason: string;
  timestamp: string;
}

// Detection data
export interface DetectionData {
  totalPeople: number;
  location: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  vulnerable: number;
  coordinates: string;
  timestamp: string;
}

// Timeline events
export interface TimelineEvent {
  id: string;
  time: string; // e.g. "10:30 AM"
  description: string;
}
