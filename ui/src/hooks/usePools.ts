import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePoolStore } from '../store/poolStore';
import {
  fetchAllPools,
  fetchNearbyPools,
  getMockPools,
  fetchAvailability,
  fetchPoolSchedule,
} from '../services/poolService';
import { LocationAvailability, PoolScheduleResponse } from '../types/pool';

/**
 * Hook to fetch all pools for a specific location.
 * Falls back to mock data if the API is unreachable (handled inside the service).
 */
export const useAllPools = (location: string = 'boulder') => {
  return useQuery({
    queryKey: ['pools', 'all', location],
    queryFn: () => fetchAllPools(location),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

/**
 * Hook to fetch pools near the user's location.
 * Uses React Query for caching and automatic refetching.
 */
export const useNearbyPools = () => {
  const { userLocation, searchRadius, setPools, setIsLoading, setError } = usePoolStore();

  return useQuery({
    queryKey: ['pools', 'nearby', userLocation, searchRadius],
    queryFn: async () => {
      if (!userLocation) {
        throw new Error('User location not available');
      }
      return fetchNearbyPools(userLocation, searchRadius);
    },
    enabled: !!userLocation,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Hook to manually trigger a pool search.
 * Useful for "Search in this area" functionality.
 */
export const useSearchPools = () => {
  const { setPools, setIsLoading, setError } = usePoolStore();

  const searchPools = async (latitude: number, longitude: number, radius: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const pools = await fetchNearbyPools({ latitude, longitude }, radius);
      setPools(pools);
    } catch (error) {
      console.error('Error searching pools:', error);
      setError(error instanceof Error ? error.message : 'Failed to search pools');
    } finally {
      setIsLoading(false);
    }
  };

  return { searchPools };
};

/**
 * Hook to fetch lane availability for a location and day.
 * Falls back to computed mock data if the API is unreachable.
 */
export function useAvailability(location: string = 'boulder', day?: string) {
  return useQuery<LocationAvailability>({
    queryKey: ['availability', location, day],
    queryFn: () => fetchAvailability(location, day),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePoolSchedule(location: string = 'boulder') {
  return useQuery<PoolScheduleResponse>({
    queryKey: ['poolSchedule', location],
    queryFn: async () => {
      const CACHE_KEY = `poolSchedule-${location}`;
      const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

      try {
        // Try to load from AsyncStorage first
        const cachedJson = await AsyncStorage.getItem(CACHE_KEY);

        if (cachedJson) {
          const { data, timestamp } = JSON.parse(cachedJson);
          const age = Date.now() - timestamp;

          // If cache is fresh (< 6 hours), return it immediately
          if (age < CACHE_DURATION_MS) {
            console.log(`[usePoolSchedule] Using cached schedule (${Math.round(age / 1000 / 60)} minutes old)`);
            return data as PoolScheduleResponse;
          }

          console.log(`[usePoolSchedule] Cache expired (${Math.round(age / 1000 / 60 / 60)} hours old), fetching fresh data`);
        }
      } catch (err) {
        console.warn('[usePoolSchedule] Error reading from AsyncStorage:', err);
      }

      // Fetch fresh data from API
      const freshData = await fetchPoolSchedule(location);

      // Cache the fresh data in AsyncStorage
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          data: freshData,
          timestamp: Date.now(),
        }));
        console.log('[usePoolSchedule] Cached fresh schedule data');
      } catch (err) {
        console.warn('[usePoolSchedule] Error writing to AsyncStorage:', err);
      }

      return freshData;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — schedule pages don't change often
    refetchInterval: (query) => {
      // If the data is stale and refreshing, poll every 5 seconds to get updated data
      const data = query.state.data;
      if (data?._metadata?.stale && data._metadata.isRefreshing) {
        return 5000; // 5 seconds
      }
      return false; // Don't auto-refetch otherwise
    },
  });
}
