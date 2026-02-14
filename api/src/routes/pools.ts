import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Pool } from '../types/pool';
import { fallbackPools } from '../data/fallbackPools';

const router = Router();

/**
 * Load pools from the JSON file written by the scraper.
 * Falls back to hardcoded data if the file does not exist or cannot be parsed.
 */
function loadPools(): Pool[] {
  const dataFilePath = path.resolve(__dirname, '../../data/pools.json');

  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as Pool[];
      console.log(`[pools] Loaded ${parsed.length} pools from ${dataFilePath}`);
      return parsed;
    }
  } catch (err) {
    console.warn('[pools] Failed to load pools.json, using fallback data:', err);
  }

  console.log('[pools] Using fallback hardcoded pool data');
  return fallbackPools;
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

// ---------------------------------------------------------------------------
// GET /pools
// Returns all pools
// ---------------------------------------------------------------------------
router.get('/', (_req: Request, res: Response) => {
  const pools = loadPools();
  res.json(pools);
});

// ---------------------------------------------------------------------------
// GET /pools/nearby?lat=&lng=&radius=
// Returns pools within `radius` miles sorted by distance (ascending).
// Also supports the frontend's `latitude` / `longitude` param names.
// ---------------------------------------------------------------------------
router.get('/nearby', (req: Request, res: Response) => {
  const lat = parseFloat((req.query.lat ?? req.query.latitude) as string);
  const lng = parseFloat((req.query.lng ?? req.query.longitude) as string);
  const radius = parseFloat((req.query.radius as string) ?? '10');

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({
      error: 'Missing or invalid query parameters: lat (or latitude) and lng (or longitude) are required',
    });
    return;
  }

  const searchRadius = isNaN(radius) ? 10 : radius;
  const pools = loadPools();

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
// GET /pools/search?q=
// Case-insensitive search against pool name and address.
// Optionally sorted by distance if lat/lng are provided.
// ---------------------------------------------------------------------------
router.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string | undefined) ?? '';
  const lat = parseFloat((req.query.lat ?? req.query.latitude) as string);
  const lng = parseFloat((req.query.lng ?? req.query.longitude) as string);

  if (!query.trim()) {
    res.status(400).json({ error: 'Missing query parameter: q is required' });
    return;
  }

  const pools = loadPools();
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
// GET /pools/:id
// Returns a single pool by ID or 404
// ---------------------------------------------------------------------------
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const pools = loadPools();
  const pool = pools.find((p) => p.id === id);

  if (!pool) {
    res.status(404).json({ error: `Pool with id '${id}' not found` });
    return;
  }

  res.json(pool);
});

export default router;
