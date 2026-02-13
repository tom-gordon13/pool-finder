import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Pool } from '../types/pool';
import { locations, LocationConfig } from '../data/locations';
import { fallbackPools } from '../data/fallbackPools';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a time string like "5:30 AM" or "8:00 PM" into decimal hours (0-23).
 * Returns NaN if the string cannot be parsed.
 */
function parseTimeToHour24(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return NaN;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }

  return hours + minutes / 60;
}

/**
 * Format a 24-hour integer (e.g. 5) as a 12-hour display string ("5:00 AM").
 */
function formatHour(hour24: number): string {
  if (hour24 === 0) return '12:00 AM';
  if (hour24 < 12) return `${hour24}:00 AM`;
  if (hour24 === 12) return '12:00 PM';
  return `${hour24 - 12}:00 PM`;
}

/**
 * Haversine formula: returns the great-circle distance between two points
 * on the earth in miles.
 */
function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const EARTH_RADIUS_MILES = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Load pools for a given location config.
 * Tries to load from backend/data/{config.dataFile}, falls back to
 * fallbackPools filtered by city if the file is missing/corrupt.
 * Returns null if locationId is completely unknown.
 */
function loadPoolsForLocation(locationId: string): Pool[] | null {
  const config: LocationConfig | undefined = locations.find(
    (l) => l.id === locationId
  );

  if (!config) return null;

  const dataFilePath = path.resolve(__dirname, '../../data', config.dataFile);

  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as Pool[];
      console.log(
        `[locations] Loaded ${parsed.length} pools from ${dataFilePath}`
      );
      // Ensure city and laneCount defaults for any records that lack them
      return parsed.map((p) => ({
        ...p,
        city: p.city ?? locationId,
        laneCount: p.laneCount ?? 6,
      }));
    }
  } catch (err) {
    console.warn(
      `[locations] Failed to load ${config.dataFile}, using fallback data:`,
      err
    );
  }

  console.log(
    `[locations] Using fallback data for location '${locationId}'`
  );
  return fallbackPools.filter((p) => p.city === locationId);
}

// ---------------------------------------------------------------------------
// GET /locations
// List all available locations with pool counts.
// ---------------------------------------------------------------------------
router.get('/', (_req: Request, res: Response) => {
  const result = locations.map((loc) => {
    const pools = loadPoolsForLocation(loc.id) ?? [];
    return {
      id: loc.id,
      name: loc.name,
      center: loc.center,
      poolCount: pools.length,
    };
  });
  res.json(result);
});

// ---------------------------------------------------------------------------
// GET /locations/:location/pools
// Returns all pools in the given location.
// ---------------------------------------------------------------------------
router.get('/:location/pools', (req: Request, res: Response) => {
  const { location } = req.params;
  const pools = loadPoolsForLocation(location);

  if (pools === null) {
    res.status(404).json({ error: `Location '${location}' not found` });
    return;
  }

  res.json(pools);
});

// ---------------------------------------------------------------------------
// GET /locations/:location/pools/nearby?lat=&lng=&radius=
// Returns pools within `radius` miles sorted by distance (ascending).
// Also supports the frontend's `latitude` / `longitude` param names.
// ---------------------------------------------------------------------------
router.get('/:location/pools/nearby', (req: Request, res: Response) => {
  const { location } = req.params;
  const pools = loadPoolsForLocation(location);

  if (pools === null) {
    res.status(404).json({ error: `Location '${location}' not found` });
    return;
  }

  const lat = parseFloat((req.query.lat ?? req.query.latitude) as string);
  const lng = parseFloat((req.query.lng ?? req.query.longitude) as string);
  const radius = parseFloat((req.query.radius as string) ?? '10');

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({
      error:
        'Missing or invalid query parameters: lat (or latitude) and lng (or longitude) are required',
    });
    return;
  }

  const searchRadius = isNaN(radius) ? 10 : radius;

  const nearbyPools = pools
    .map((pool) => {
      const distance = haversineDistanceMiles(
        lat,
        lng,
        pool.location.latitude,
        pool.location.longitude
      );
      return { ...pool, distance: Math.round(distance * 10) / 10 };
    })
    .filter((pool) => pool.distance <= searchRadius)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  res.json(nearbyPools);
});

// ---------------------------------------------------------------------------
// GET /locations/:location/pools/search?q=
// Case-insensitive search against pool name and address.
// Optionally sorted by distance if lat/lng are provided.
// ---------------------------------------------------------------------------
router.get('/:location/pools/search', (req: Request, res: Response) => {
  const { location } = req.params;
  const pools = loadPoolsForLocation(location);

  if (pools === null) {
    res.status(404).json({ error: `Location '${location}' not found` });
    return;
  }

  const query = (req.query.q as string | undefined) ?? '';
  const lat = parseFloat((req.query.lat ?? req.query.latitude) as string);
  const lng = parseFloat((req.query.lng ?? req.query.longitude) as string);

  if (!query.trim()) {
    res.status(400).json({ error: 'Missing query parameter: q is required' });
    return;
  }

  const lowerQuery = query.toLowerCase();

  let results = pools.filter(
    (pool) =>
      pool.name.toLowerCase().includes(lowerQuery) ||
      pool.address.toLowerCase().includes(lowerQuery)
  );

  // Augment with distance if coordinates provided
  if (!isNaN(lat) && !isNaN(lng)) {
    results = results
      .map((pool) => {
        const distance = haversineDistanceMiles(
          lat,
          lng,
          pool.location.latitude,
          pool.location.longitude
        );
        return { ...pool, distance: Math.round(distance * 10) / 10 };
      })
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }

  res.json(results);
});

// ---------------------------------------------------------------------------
// GET /locations/:location/pools/availability?day=Monday
// Returns lane availability by hour (5 AM – 10 PM) across all pools.
// ---------------------------------------------------------------------------
router.get('/:location/pools/availability', (req: Request, res: Response) => {
  const { location } = req.params;
  const pools = loadPoolsForLocation(location);

  if (pools === null) {
    res.status(404).json({ error: `Location '${location}' not found` });
    return;
  }

  const day = (req.query.day as string | undefined) ?? 'Monday';
  const DEFAULT_LANE_COUNT = 6;

  // Hours to check: 5 AM through 10 PM (inclusive start of each slot)
  const hours: number[] = [];
  for (let h = 5; h <= 22; h++) {
    hours.push(h);
  }

  const hourSlots = hours.map((hour24) => {
    const openPools = pools
      .map((pool) => {
        const schedule = pool.lapSwimHours.find(
          (s) => s.dayOfWeek.toLowerCase() === day.toLowerCase()
        );
        if (!schedule) return null;

        const openHour = parseTimeToHour24(schedule.openTime);
        const closeHour = parseTimeToHour24(schedule.closeTime);

        if (isNaN(openHour) || isNaN(closeHour)) return null;

        // Pool is considered open during this hour if its window overlaps
        // the slot [hour24, hour24+1): i.e. openTime < hour24+1 AND closeTime > hour24
        if (openHour < hour24 + 1 && closeHour > hour24) {
          return {
            poolId: pool.id,
            poolName: pool.name,
            laneCount: pool.laneCount ?? DEFAULT_LANE_COUNT,
            openTime: schedule.openTime,
            closeTime: schedule.closeTime,
          };
        }

        return null;
      })
      .filter(
        (
          entry
        ): entry is {
          poolId: string;
          poolName: string;
          laneCount: number;
          openTime: string;
          closeTime: string;
        } => entry !== null
      );

    const totalLanes = openPools.reduce((sum, p) => sum + p.laneCount, 0);

    return {
      hour: formatHour(hour24),
      hour24,
      openPools,
      totalOpenPools: openPools.length,
      totalLanes,
    };
  });

  res.json({
    location,
    day,
    hours: hourSlots,
  });
});

// ---------------------------------------------------------------------------
// GET /locations/:location/pools/:id
// Returns a single pool by ID or 404.
// NOTE: This must be registered AFTER the named sub-routes above so that
// "nearby", "search", and "availability" are not consumed by :id.
// ---------------------------------------------------------------------------
router.get('/:location/pools/:id', (req: Request, res: Response) => {
  const { location, id } = req.params;
  const pools = loadPoolsForLocation(location);

  if (pools === null) {
    res.status(404).json({ error: `Location '${location}' not found` });
    return;
  }

  const pool = pools.find((p) => p.id === id);

  if (!pool) {
    res
      .status(404)
      .json({ error: `Pool with id '${id}' not found in location '${location}'` });
    return;
  }

  res.json(pool);
});

export default router;
