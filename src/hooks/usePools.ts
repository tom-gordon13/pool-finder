import { useQuery } from '@tanstack/react-query';
import { usePoolStore } from '../store/poolStore';
import {
  fetchAllPools,
  fetchNearbyPools,
  getMockPools,
  fetchAvailability,
} from '../services/poolService';
import { LocationAvailability } from '../types/pool';

/**
 * Hook to fetch all Boulder pools.
 * Falls back to mock data if the API is unreachable (handled inside the service).
 */
export const useAllPools = () => {
  return useQuery({
    queryKey: ['pools', 'all'],
    queryFn: fetchAllPools,
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
