import { ReactNode } from 'react';

// Inventory items
export interface InventoryItem {
  id: string;
  name: string;
  icon: ReactNode;
  current: number;
  total: number;
  color: string;
  bgColor: string;
}

// Allocation recommendation type
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
  time: string;
  description: string;
}

// Drone data
export interface DroneData {
  Cluster_ID: string;
  No_of_People: number;
  Latitude: number;
  Longitude: number;
  Distance_from_Inventory_km: number;
}