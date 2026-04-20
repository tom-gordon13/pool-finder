import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Pool, TimeSlot } from '../types/pool';
import { locations, LocationConfig } from '../data/locations';
import { fallbackPools } from '../data/fallbackPools';
import { scrapePoolSchedule } from '../scraper/poolScheduleScraper';
import { prisma } from '../db/client';

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
 * Returns true when the lastScraped timestamp is older than 6 hours or absent.
 */
function isDataStale(lastScraped: string | undefined): boolean {
  if (!lastScraped) return true;
  const age = Date.now() - new Date(lastScraped).getTime();
  return age > 6 * 60 * 60 * 1000; // 6 hours
}

/**
 * Load pools for a location directly from the PostgreSQL database via Prisma.
 * Returns null if the DB query throws or returns no rows.
 */
async function loadPoolsFromDB(localityId: string): Promise<Pool[] | null> {
  try {
    const dbPools = await prisma.pool.findMany({
      where: { locality_id: localityId },
      include: { lap_swim_hours: true, time_slots: true },
    });

    if (!dbPools || dbPools.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dbPools as any[]).map((pool: any) => ({
      id: pool.id as string,
      name: pool.name as string,
      address: pool.address as string,
      city: pool.locality_id as string,
      location: { latitude: pool.latitude as number, longitude: pool.longitude as number },
      phoneNumber: (pool.phone_number ?? undefined) as string | undefined,
      website: (pool.website ?? undefined) as string | undefined,
      isPublic: true,
      lapSwimHours: (pool.lap_swim_hours as any[]).map((h: any) => ({
        dayOfWeek: h.day_of_week as string,
        openTime: h.open_time as string,
        closeTime: h.close_time as string,
      })),
      schedule: (pool.time_slots as any[]).map((s: any) => ({
        dayOfWeek: s.day_of_week as string,
        startHour: s.start_hour as number,
        lanes: s.lanes as number,
      })),
      laneCount: (pool.lane_count ?? 6) as number,
      lastUpdated: pool.last_scraped ? (pool.last_scraped as Date).toISOString() : undefined,
    })) as Pool[];
  } catch (err) {
    console.warn('[locations] DB query failed, falling back to file data:', err);
    return null;
  }
}

/**
 * Load pools for a given location config.
 * Tries to load from backend/data/{config.dataFile}, falls back to
 * fallbackPools filtered by city if the file is missing/corrupt.
 * Returns null if locationId is completely unknown.
 */
async function loadPoolsForLocation(locationId: string): Promise<Pool[] | null> {
  const config: LocationConfig | undefined = locations.find(
    (l) => l.id === locationId
  );

  if (!config) return null;

  // -------------------------------------------------------------------------
  // 1. Try the database first (when DATABASE_URL is configured)
  // -------------------------------------------------------------------------
  if (process.env.DATABASE_URL) {
    const dbPools = await loadPoolsFromDB(locationId);
    if (dbPools && dbPools.length > 0) {
      console.log(
        `[locations] Loaded ${dbPools.length} pools from DB for '${locationId}'`
      );
      return dbPools;
    }
    console.log(
      `[locations] DB returned no pools for '${locationId}', falling back to file data`
    );
  }

  // -------------------------------------------------------------------------
  // 2. Fall back to JSON file, then hardcoded fallback data
  // -------------------------------------------------------------------------
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
// Active-alert loader
// ---------------------------------------------------------------------------

/**
 * Shape returned by loadActiveAlertsForLocality.
 */
interface ActiveAlert {
  poolId: string | null;
  poolName: string | null;
  reason: string;
  failedAt: string;
  lastGoodScrape: string | null;
}

/**
 * Fetch all unresolved scrape alerts for a given locality.
 * Returns an empty array on error so the pools endpoint never hard-fails
 * because of the alerts sub-query.
 */
async function loadActiveAlertsForLocality(localityId: string): Promise<ActiveAlert[]> {
  try {
    const rows = await prisma.scrapeAlert.findMany({
      where:   { locality_id: localityId, resolved_at: null },
      orderBy: { failed_at: 'desc' },
    });

    return rows.map((row) => ({
      poolId:        row.pool_id ?? null,
      poolName:      null, // pool_id is not joined to Pool here; failure_reason contains context
      reason:        row.failure_reason,
      failedAt:      row.failed_at.toISOString(),
      lastGoodScrape: row.last_good_scrape ? row.last_good_scrape.toISOString() : null,
    }));
  } catch (err) {
    console.warn('[locations] Failed to load active alerts:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// GET /locations
// List all available locations with pool counts.
// ---------------------------------------------------------------------------
router.get('/', async (_req: Request, res: Response) => {
  const result = await Promise.all(
    locations.map(async (loc) => {
      const pools = (await loadPoolsForLocation(loc.id)) ?? [];
      return {
        id: loc.id,
        name: loc.name,
        center: loc.center,
        poolCount: pools.length,
      };
    })
  );
  res.json(result);
});

// ---------------------------------------------------------------------------
// GET /locations/:location/pools
// Returns all pools in the given location, plus any active scrape alerts.
// Response shape: { pools: Pool[], alerts: ActiveAlert[] }
// ---------------------------------------------------------------------------
router.get('/:location/pools', async (req: Request, res: Response) => {
  const { location } = req.params;
  const pools = await loadPoolsForLocation(location);

  if (pools === null) {
    res.status(404).json({ error: `Location '${location}' not found` });
    return;
  }

  const alerts = await loadActiveAlertsForLocality(location);

  res.json({ pools, alerts });
});

// ---------------------------------------------------------------------------
// GET /locations/:location/pools/nearby?lat=&lng=&radius=
// Returns pools within `radius` miles sorted by distance (ascending).
// Also supports the frontend's `latitude` / `longitude` param names.
// ---------------------------------------------------------------------------
router.get('/:location/pools/nearby', async (req: Request, res: Response) => {
  const { location } = req.params;
  const pools = await loadPoolsForLocation(location);

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
router.get('/:location/pools/search', async (req: Request, res: Response) => {
  const { location } = req.params;
  const pools = await loadPoolsForLocation(location);

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
router.get('/:location/pools/availability', async (req: Request, res: Response) => {
  const { location } = req.params;
  const pools = await loadPoolsForLocation(location);

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

  // Extract granular schedule if available
  const granularSchedule = pools.flatMap(p =>
    (p.schedule || [])
      .filter(s => s.dayOfWeek.toLowerCase() === day.toLowerCase())
      .map(s => ({
        ...s,
        poolId: p.id,
        poolName: p.name
      }))
  );

  res.json({
    location,
    day,
    hours: hourSlots,
    schedule: granularSchedule.length > 0 ? granularSchedule : undefined
  });
});

// ---------------------------------------------------------------------------
// Schedule cache
// Scrapes are expensive (4 HTTP requests, ~5-20s total). We cache the result
// in memory and refresh it in the background every 6 hours. The first request
// triggers the initial scrape and returns a 202 while it warms up; every
// subsequent request returns instantly from cache.
// ---------------------------------------------------------------------------

interface ScheduleCache {
  location: string;
  weekStart: string;
  pools: { poolId: string; poolName: string; slots: TimeSlot[] }[];
  cachedAt: number; // Date.now()
}

const scheduleCache = new Map<string, ScheduleCache>();
const scrapeInProgress = new Set<string>();

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

async function runScrape(location: string): Promise<void> {
  if (scrapeInProgress.has(location)) return;
  scrapeInProgress.add(location);

  console.log(`[schedule] Starting background scrape for '${location}'`);

  try {
    const config = locations.find(l => l.id === location);
    const pools = await loadPoolsForLocation(location);
    if (!config || !pools) return;

    const scheduleUrls = config.poolScheduleUrls ?? {};
    const weekStart = getWeekStart();

    // Sequential scraping with a small delay between requests to avoid
    // rate-limiting from bouldercolorado.gov
    const results: { poolId: string; poolName: string; slots: TimeSlot[] }[] = [];
    for (const pool of pools) {
      const url = scheduleUrls[pool.id];
      if (!url) {
        results.push({ poolId: pool.id, poolName: pool.name, slots: [] });
        continue;
      }
      console.log(`[schedule] Scraping '${pool.name}'`);
      const slots = await scrapePoolSchedule(url);
      console.log(`[schedule] '${pool.name}': ${slots.length} slots`);
      results.push({ poolId: pool.id, poolName: pool.name, slots });
      // Delay between requests to avoid rate-limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    scheduleCache.set(location, { location, weekStart, pools: results, cachedAt: Date.now() });
    console.log(`[schedule] Cache updated for '${location}'`);
  } catch (err) {
    console.error(`[schedule] Background scrape failed for '${location}':`, err);
  } finally {
    scrapeInProgress.delete(location);
  }
}

// ---------------------------------------------------------------------------
// GET /locations/:location/pools/schedule
// Returns cached 30-min TimeSlot schedule for every pool in the location.
// If DATABASE_URL is set and DB data is fresh (< 6 hours), serves time_slots
// directly from the DB without scraping.
// Otherwise falls back to in-memory scheduleCache; first request returns 202
// and triggers a background scrape; subsequent requests return from cache.
// ---------------------------------------------------------------------------
router.get('/:location/pools/schedule', async (req: Request, res: Response) => {
  const { location } = req.params;

  if (!locations.find(l => l.id === location)) {
    res.status(404).json({ error: `Location '${location}' not found` });
    return;
  }

  // -------------------------------------------------------------------------
  // If DATABASE_URL is set, try to serve directly from DB time_slots when fresh
  // -------------------------------------------------------------------------
  if (process.env.DATABASE_URL) {
    const dbPools = await loadPoolsFromDB(location);
    if (dbPools && dbPools.length > 0) {
      const hasScheduleData = dbPools.some(p => p.schedule && p.schedule.length > 0);
      if (hasScheduleData) {
        // Use the oldest lastUpdated across all pools as the freshness indicator
        const oldestLastUpdated = dbPools.reduce<string | undefined>((oldest, p) => {
          if (!p.lastUpdated) return oldest;
          if (!oldest) return p.lastUpdated;
          return new Date(p.lastUpdated) < new Date(oldest) ? p.lastUpdated : oldest;
        }, undefined);

        if (!isDataStale(oldestLastUpdated)) {
          // Data is fresh — build the schedule response directly from DB and return
          console.log(`[schedule] Serving fresh DB schedule for '${location}'`);
          const weekStart = getWeekStart();
          const pools = dbPools.map(p => ({
            poolId: p.id,
            poolName: p.name,
            slots: (p.schedule ?? []) as TimeSlot[],
          }));
          res.json({ location, weekStart, pools });
          return;
        }

        // Data exists but is stale — trigger background re-scrape and return
        // what we have from the in-memory cache (or the DB data as fallback)
        console.log(`[schedule] DB schedule for '${location}' is stale, triggering re-scrape`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Fall back to in-memory scheduleCache + background scraping
  // -------------------------------------------------------------------------
  const cached = scheduleCache.get(location);
  const cacheStale = !cached || (Date.now() - cached.cachedAt > CACHE_TTL_MS);

  // Kick off a background refresh if stale (non-blocking)
  if (cacheStale) {
    runScrape(location);
  }

  if (!cached) {
    // Nothing cached yet — scrape just started, tell the client to retry
    res.status(202).json({
      status: 'loading',
      message: 'Schedule is being fetched, please retry in a few seconds.',
    });
    return;
  }

  res.json(cached);
});

// ---------------------------------------------------------------------------
// GET /locations/:location/pools/:id
// Returns a single pool by ID or 404.
// NOTE: This must be registered AFTER the named sub-routes above so that
// "nearby", "search", and "availability" are not consumed by :id.
// ---------------------------------------------------------------------------
router.get('/:location/pools/:id', async (req: Request, res: Response) => {
  const { location, id } = req.params;
  const pools = await loadPoolsForLocation(location);

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
