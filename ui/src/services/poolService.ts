import axios from 'axios';
import { Pool, UserLocation, LocationAvailability, HourAvailability, PoolAvailabilitySlot, PoolScheduleResponse } from '../types/pool';

// Set to true to always use mock data (useful for offline development)
const USE_MOCK_DATA = false;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Boulder, CO pool mock data for fallback when API is unreachable
const MOCK_POOLS: Pool[] = [
  {
    id: 'east-boulder-rec',
    name: 'East Boulder Community Center',
    address: '5660 Sioux Dr, Boulder, CO 80303',
    location: { latitude: 40.0083, longitude: -105.2278 },
    phoneNumber: '(303) 441-4400',
    website: 'https://bouldercolorado.gov/parks-rec/east-boulder-community-center',
    isPublic: true,
    lapSwimHours: [
      { dayOfWeek: 'Monday', openTime: '5:30 AM', closeTime: '8:00 AM' },
      { dayOfWeek: 'Monday', openTime: '11:00 AM', closeTime: '1:00 PM' },
      { dayOfWeek: 'Tuesday', openTime: '5:30 AM', closeTime: '8:00 AM' },
      { dayOfWeek: 'Tuesday', openTime: '11:00 AM', closeTime: '1:00 PM' },
      { dayOfWeek: 'Wednesday', openTime: '5:30 AM', closeTime: '8:00 AM' },
      { dayOfWeek: 'Wednesday', openTime: '11:00 AM', closeTime: '1:00 PM' },
      { dayOfWeek: 'Thursday', openTime: '5:30 AM', closeTime: '8:00 AM' },
      { dayOfWeek: 'Thursday', openTime: '11:00 AM', closeTime: '1:00 PM' },
      { dayOfWeek: 'Friday', openTime: '5:30 AM', closeTime: '8:00 AM' },
      { dayOfWeek: 'Friday', openTime: '11:00 AM', closeTime: '1:00 PM' },
      { dayOfWeek: 'Saturday', openTime: '7:00 AM', closeTime: '11:00 AM' },
      { dayOfWeek: 'Sunday', openTime: '7:00 AM', closeTime: '11:00 AM' },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'north-boulder-rec',
    name: 'North Boulder Recreation Center',
    address: '3170 Broadway, Boulder, CO 80304',
    location: { latitude: 40.0436, longitude: -105.2797 },
    phoneNumber: '(303) 413-7260',
    website: 'https://bouldercolorado.gov/parks-rec/north-boulder-recreation-center',
    isPublic: true,
    lapSwimHours: [
      { dayOfWeek: 'Monday', openTime: '6:00 AM', closeTime: '9:00 AM' },
      { dayOfWeek: 'Monday', openTime: '12:00 PM', closeTime: '2:00 PM' },
      { dayOfWeek: 'Tuesday', openTime: '6:00 AM', closeTime: '9:00 AM' },
      { dayOfWeek: 'Tuesday', openTime: '12:00 PM', closeTime: '2:00 PM' },
      { dayOfWeek: 'Wednesday', openTime: '6:00 AM', closeTime: '9:00 AM' },
      { dayOfWeek: 'Wednesday', openTime: '12:00 PM', closeTime: '2:00 PM' },
      { dayOfWeek: 'Thursday', openTime: '6:00 AM', closeTime: '9:00 AM' },
      { dayOfWeek: 'Thursday', openTime: '12:00 PM', closeTime: '2:00 PM' },
      { dayOfWeek: 'Friday', openTime: '6:00 AM', closeTime: '9:00 AM' },
      { dayOfWeek: 'Friday', openTime: '12:00 PM', closeTime: '2:00 PM' },
      { dayOfWeek: 'Saturday', openTime: '8:00 AM', closeTime: '12:00 PM' },
      { dayOfWeek: 'Sunday', openTime: '8:00 AM', closeTime: '12:00 PM' },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'scott-carpenter-pool',
    name: 'Scott Carpenter Pool',
    address: '30th St & Arapahoe Ave, Boulder, CO 80303',
    location: { latitude: 40.0124, longitude: -105.2519 },
    phoneNumber: '(303) 441-3427',
    website: 'https://bouldercolorado.gov/parks-rec/scott-carpenter-pool',
    isPublic: true,
    lapSwimHours: [
      { dayOfWeek: 'Monday', openTime: '6:00 AM', closeTime: '7:45 AM' },
      { dayOfWeek: 'Monday', openTime: '11:30 AM', closeTime: '1:30 PM' },
      { dayOfWeek: 'Tuesday', openTime: '6:00 AM', closeTime: '7:45 AM' },
      { dayOfWeek: 'Wednesday', openTime: '6:00 AM', closeTime: '7:45 AM' },
      { dayOfWeek: 'Wednesday', openTime: '11:30 AM', closeTime: '1:30 PM' },
      { dayOfWeek: 'Thursday', openTime: '6:00 AM', closeTime: '7:45 AM' },
      { dayOfWeek: 'Friday', openTime: '6:00 AM', closeTime: '7:45 AM' },
      { dayOfWeek: 'Friday', openTime: '11:30 AM', closeTime: '1:30 PM' },
      { dayOfWeek: 'Saturday', openTime: '7:30 AM', closeTime: '10:00 AM' },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'south-boulder-rec',
    name: 'South Boulder Recreation Center',
    address: '1360 Gillaspie Dr, Boulder, CO 80305',
    location: { latitude: 39.9845, longitude: -105.2608 },
    phoneNumber: '(303) 441-3448',
    website: 'https://bouldercolorado.gov/parks-rec/south-boulder-recreation-center',
    isPublic: true,
    lapSwimHours: [
      { dayOfWeek: 'Monday', openTime: '5:30 AM', closeTime: '7:30 AM' },
      { dayOfWeek: 'Monday', openTime: '11:00 AM', closeTime: '1:30 PM' },
      { dayOfWeek: 'Tuesday', openTime: '5:30 AM', closeTime: '7:30 AM' },
      { dayOfWeek: 'Tuesday', openTime: '11:00 AM', closeTime: '1:30 PM' },
      { dayOfWeek: 'Wednesday', openTime: '5:30 AM', closeTime: '7:30 AM' },
      { dayOfWeek: 'Wednesday', openTime: '11:00 AM', closeTime: '1:30 PM' },
      { dayOfWeek: 'Thursday', openTime: '5:30 AM', closeTime: '7:30 AM' },
      { dayOfWeek: 'Thursday', openTime: '11:00 AM', closeTime: '1:30 PM' },
      { dayOfWeek: 'Friday', openTime: '5:30 AM', closeTime: '7:30 AM' },
      { dayOfWeek: 'Friday', openTime: '11:00 AM', closeTime: '1:30 PM' },
      { dayOfWeek: 'Saturday', openTime: '7:00 AM', closeTime: '10:30 AM' },
      { dayOfWeek: 'Sunday', openTime: '7:00 AM', closeTime: '10:30 AM' },
    ],
    lastUpdated: new Date().toISOString(),
  },
];

/**
 * Fetch all pools for a specific location
 */
export const fetchAllPools = async (location: string = 'boulder'): Promise<Pool[]> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return MOCK_POOLS;
  }
  try {
    const response = await api.get(`/locations/${location}/pools`);
    return response.data;
  } catch (error) {
    console.warn('API unreachable, falling back to mock data:', error);
    return MOCK_POOLS;
  }
};

/**
 * Fetch pools near a given location
 */
export const fetchNearbyPools = async (
  location: UserLocation,
  radiusMiles: number = 10
): Promise<Pool[]> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return MOCK_POOLS;
  }
  try {
    const response = await api.get('/pools/nearby', {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: radiusMiles,
      },
    });
    return response.data;
  } catch (error) {
    console.warn('API unreachable, falling back to mock data:', error);
    return MOCK_POOLS;
  }
};

/**
 * Fetch details for a specific pool by ID
 */
export const fetchPoolById = async (poolId: string): Promise<Pool> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const pool = MOCK_POOLS.find(p => p.id === poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);
    return pool;
  }
  try {
    const response = await api.get(`/pools/${poolId}`);
    return response.data;
  } catch (error) {
    console.warn('API unreachable, falling back to mock data:', error);
    const pool = MOCK_POOLS.find(p => p.id === poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);
    return pool;
  }
};

/**
 * Search pools by name or address
 */
export const searchPools = async (query: string): Promise<Pool[]> => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const q = query.toLowerCase();
    return MOCK_POOLS.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }
  try {
    const response = await api.get('/pools/search', {
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    console.warn('API unreachable, falling back to mock data:', error);
    const q = query.toLowerCase();
    return MOCK_POOLS.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }
};

// Keep legacy export for backwards compat
export const getMockPools = (): Pool[] => MOCK_POOLS;

/**
 * Parse a time string like "5:30 AM" or "12:00 PM" into a 24-hour float.
 * e.g. "5:30 AM" -> 5.5, "1:00 PM" -> 13, "12:00 PM" -> 12
 */
function parseTimeTo24(timeStr: string): number {
  const [timePart, meridiem] = timeStr.trim().split(' ');
  const [hoursStr, minutesStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (meridiem === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours + minutes / 60;
}

/**
 * Format a 24-hour integer as a display string like "6:00 AM" or "12:00 PM".
 */
function formatHour(hour24: number): string {
  if (hour24 === 0) return '12:00 AM';
  if (hour24 < 12) return `${hour24}:00 AM`;
  if (hour24 === 12) return '12:00 PM';
  return `${hour24 - 12}:00 PM`;
}

/**
 * Lane counts per pool (defaults to 6 if not specified in Pool type).
 */
const POOL_LANE_COUNTS: Record<string, number> = {
  'east-boulder-rec': 6,
  'north-boulder-rec': 8,
  'scott-carpenter-pool': 6,
  'south-boulder-rec': 6,
};

/**
 * Compute availability locally from MOCK_POOLS for a given day.
 * Covers hours 5 AM (5) through 10 PM (22).
 */
export function computeAvailabilityFromMock(day: string): LocationAvailability {
  const hours: HourAvailability[] = [];

  for (let hour24 = 5; hour24 <= 22; hour24++) {
    const openPools: PoolAvailabilitySlot[] = [];

    for (const pool of MOCK_POOLS) {
      const daySchedules = pool.lapSwimHours.filter(h => h.dayOfWeek === day);
      for (const schedule of daySchedules) {
        const openTime24 = parseTimeTo24(schedule.openTime);
        const closeTime24 = parseTimeTo24(schedule.closeTime);
        // A pool is open at this hour if the hour falls within [openTime, closeTime)
        if (hour24 >= openTime24 && hour24 < closeTime24) {
          const laneCount = POOL_LANE_COUNTS[pool.id] ?? 6;
          openPools.push({
            poolId: pool.id,
            poolName: pool.name,
            laneCount,
            openTime: schedule.openTime,
            closeTime: schedule.closeTime,
          });
          break; // only add this pool once per hour even if it has multiple sessions
        }
      }
    }

    const totalLanes = openPools.reduce((sum, p) => sum + p.laneCount, 0);

    hours.push({
      hour: formatHour(hour24),
      hour24,
      openPools,
      totalOpenPools: openPools.length,
      totalLanes,
    });
  }

  return {
    location: 'boulder',
    day,
    hours,
  };
}

/**
 * Fetch lane availability for a location and day.
 * Falls back to computeAvailabilityFromMock if the API is unreachable.
 */
export const fetchAvailability = async (
  location: string = 'boulder',
  day?: string
): Promise<LocationAvailability> => {
  const dayParam = day ?? new Date().toLocaleDateString('en-US', { weekday: 'long' });
  try {
    const response = await api.get(`/locations/${location}/pools/availability`, {
      params: { day: dayParam },
    });
    return response.data;
  } catch (error) {
    console.warn('Availability API unreachable, using computed fallback:', error);
    return computeAvailabilityFromMock(dayParam);
  }
};

/**
 * Fetch the weekly pool schedule. The server caches scrape results, so the
 * first-ever request returns a 202 "loading" response while the background
 * scrape runs. We poll every 3 seconds until data arrives (up to ~60s).
 */
export async function fetchPoolSchedule(location: string): Promise<PoolScheduleResponse> {
  const MAX_ATTEMPTS = 20;
  const POLL_INTERVAL_MS = 3000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await api.get(`/locations/${location}/pools/schedule`, {
        timeout: 10000,
        // Allow 202 through without throwing so we can inspect it
        validateStatus: (status) => status === 200 || status === 202,
      });

      if (response.status === 200) {
        return response.data as PoolScheduleResponse;
      }

      // 202 means the server is still scraping — wait and retry
      console.log(`[poolService] Schedule loading (attempt ${attempt + 1}), retrying in ${POLL_INTERVAL_MS}ms…`);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    } catch (err) {
      console.warn('[poolService] fetchPoolSchedule error:', err);
      return { location, weekStart: '', pools: [] };
    }
  }

  console.warn('[poolService] fetchPoolSchedule timed out waiting for schedule data');
  return { location, weekStart: '', pools: [] };
}
