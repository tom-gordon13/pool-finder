import { create } from 'zustand';
import { Pool, UserLocation } from '../types/pool';

interface PoolState {
  // User location
  userLocation: UserLocation | null;
  setUserLocation: (location: UserLocation | null) => void;

  // Pools data
  pools: Pool[];
  setPools: (pools: Pool[]) => void;
  addPool: (pool: Pool) => void;
  updatePool: (id: string, updates: Partial<Pool>) => void;

  // Selected pool for detail view
  selectedPool: Pool | null;
  setSelectedPool: (pool: Pool | null) => void;

  // Loading and error states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Search radius in miles
  searchRadius: number;
  setSearchRadius: (radius: number) => void;

  // Filter for open now
  showOpenNow: boolean;
  setShowOpenNow: (show: boolean) => void;

  // Clear all pools
  clearPools: () => void;
}

export const usePoolStore = create<PoolState>((set) => ({
  // Initial state
  userLocation: null,
  pools: [],
  selectedPool: null,
  isLoading: false,
  error: null,
  searchRadius: 10, // Default 10 miles
  showOpenNow: false,

  // Actions
  setUserLocation: (location) => set({ userLocation: location }),

  setPools: (pools) => set({ pools }),

  addPool: (pool) => set((state) => ({
    pools: [...state.pools, pool],
  })),

  updatePool: (id, updates) => set((state) => ({
    pools: state.pools.map((pool) =>
      pool.id === id ? { ...pool, ...updates } : pool
    ),
  })),

  setSelectedPool: (pool) => set({ selectedPool: pool }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setSearchRadius: (radius) => set({ searchRadius: radius }),

  setShowOpenNow: (show) => set({ showOpenNow: show }),

  clearPools: () => set({ pools: [], selectedPool: null }),
}));
