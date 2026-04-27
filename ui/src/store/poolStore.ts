import { create } from 'zustand';
import { Pool } from '../types/pool';

interface PoolState {
  // Selected location (e.g., 'boulder')
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;

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

  // Filter for open now
  showOpenNow: boolean;
  setShowOpenNow: (show: boolean) => void;

  // Favorite pools
  favoritePoolIds: Set<string>;
  toggleFavorite: (poolId: string) => void;
  isFavorite: (poolId: string) => boolean;

  // Clear all pools
  clearPools: () => void;
}

export const usePoolStore = create<PoolState>((set) => ({
  // Initial state
  selectedLocation: 'boulder', // Default to Boulder
  pools: [],
  selectedPool: null,
  isLoading: false,
  error: null,
  showOpenNow: false,
  favoritePoolIds: new Set<string>(),

  // Actions
  setSelectedLocation: (location) => set({ selectedLocation: location }),

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

  setShowOpenNow: (show) => set({ showOpenNow: show }),

  toggleFavorite: (poolId) => set((state) => {
    const newFavorites = new Set(state.favoritePoolIds);
    if (newFavorites.has(poolId)) {
      newFavorites.delete(poolId);
    } else {
      newFavorites.add(poolId);
    }
    return { favoritePoolIds: newFavorites };
  }),

  isFavorite: (poolId) => {
    const state = usePoolStore.getState();
    return state.favoritePoolIds.has(poolId);
  },

  clearPools: () => set({ pools: [], selectedPool: null }),
}));
