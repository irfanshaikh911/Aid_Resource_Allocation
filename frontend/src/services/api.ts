import type { AllocationRecommendationType } from '../types';

export interface DroneRecommendation {
  Cluster_ID: string;
  No_of_People: number;
  Latitude: number;
  Longitude: number;
  Distance_from_Inventory_km: number;
  priority_score: number;
  recommended_resources: {
    'Medical Kits': number;
    'Food Packets': number;
    'Water Bottles': number;
    'Blankets': number;
    'Emergency Kits': number;
  };
}

const API_BASE_URL = 'http://localhost:5000/api';

export const getRecommendations = async (
  minPeople: number = 0,
  maxDistance: number = 100
): Promise<DroneRecommendation[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/recommendations?min_people=${minPeople}&max_distance=${maxDistance}`
    );
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch recommendations');
    }
    
    if (data.success) {
      return data.recommendations;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};

export const updateInventory = async (
  itemName: string,
  quantity: number
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/inventory/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item: itemName,
        quantity: quantity,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update inventory');
    }
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
};