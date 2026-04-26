/**
 * index.ts – Scraper entry point
 *
 * Run with:
 *   npx ts-node src/scraper/index.ts
 *
 * Or via npm script:
 *   npm run scrape
 *
 * Fetches live pool schedule data from the City of Boulder Parks & Recreation
 * website, falls back to hardcoded data on failure, and writes the result to
 * backend/data/pools.json where the Express API can read it.
 *
 * After writing the JSON file it also persists the data to PostgreSQL via
 * Prisma (if DATABASE_URL is set).
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { scrapeBoulderPools, getFallbackPools } from './boulderScraper';
import { Pool } from '../types/pool';
import { prisma } from '../db/client';
import { ScraperValidator, ScraperResult } from './ScraperValidator';
import { sendScraperAlertEmail, sendScraperSuccessEmail } from '../alerts';

// ---------------------------------------------------------------------------
// Output path
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.resolve(__dirname, '../../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'pools.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.log(`[index] Creating output directory: ${OUTPUT_DIR}`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function savePools(pools: Pool[]): void {
  ensureOutputDir();
  const json = JSON.stringify(pools, null, 2);
  fs.writeFileSync(OUTPUT_FILE, json, 'utf-8');
  console.log(`\n[index] Saved ${pools.length} pools to: ${OUTPUT_FILE}`);
}

function printSummary(pools: Pool[]): void {
  console.log('\n--- Pool Data Summary ---');
  for (const pool of pools) {
    console.log(`\n  ${pool.name}`);
    console.log(`    Address : ${pool.address}`);
    console.log(`    Phone   : ${pool.phoneNumber ?? 'N/A'}`);
    console.log(`    Website : ${pool.website ?? 'N/A'}`);
    console.log(`    Lap swim hours (${pool.lapSwimHours.length} entries):`);
    for (const h of pool.lapSwimHours) {
      console.log(`      ${h.dayOfWeek.padEnd(10)} ${h.openTime} – ${h.closeTime}`);
    }
    console.log(`    Last updated: ${pool.lastUpdated}`);
  }
  console.log('\n-------------------------\n');
}

// ---------------------------------------------------------------------------
// Database write
// ---------------------------------------------------------------------------

async function savePoolsToDatabase(pools: Pool[]): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL not set, skipping database write');
    return;
  }

  try {
    // ------------------------------------------------------------------
    // 0. Query current pool IDs for this locality so the validator can
    //    detect missing / extra pools.
    // ------------------------------------------------------------------
    const existingRows = await prisma.pool.findMany({
      where: { locality_id: 'boulder' },
      select: { id: true },
    });
    const expectedPoolIds = existingRows.map((r) => r.id);

    // ------------------------------------------------------------------
    // 1. Map Pool[] → ScraperResult[] and run validation.
    // ------------------------------------------------------------------
    const scraperResults: ScraperResult[] = pools.map((pool) => ({
      poolId:       pool.id,
      poolName:     pool.name,
      scrapeUrl:    pool.website ?? '',
      lapSwimHours: pool.lapSwimHours,
      timeSlots:    pool.schedule ?? [],
    }));

    const validation = ScraperValidator.validate(scraperResults, expectedPoolIds);

    if (!validation.valid) {
      // Log all failures
      console.error(
        ScraperValidator.formatFailuresForLog('BoulderScraper', validation.failures)
      );

      // Collect the pool IDs that have at least one failure so we can skip
      // their DB writes below.
      const failedPoolIds = new Set<string>(
        validation.failures
          .map((f) => f.poolId)
          .filter((id): id is string => id !== null)
      );

      // Write a scrape_alerts record for every failure
      for (const failure of validation.failures) {
        // Look up the most recent resolved alert for this pool (if any) to
        // populate last_good_scrape.
        const lastResolved = failure.poolId
          ? await prisma.scrapeAlert.findFirst({
              where: {
                locality_id: 'boulder',
                pool_id:     failure.poolId,
                resolved_at: { not: null },
              },
              orderBy: { resolved_at: 'desc' },
            })
          : null;

        await prisma.scrapeAlert.create({
          data: {
            locality_id:     'boulder',
            pool_id:         failure.poolId ?? null,
            scraper_name:    'BoulderScraper',
            failure_reason:  failure.reason,
            scrape_url:      failure.scrapeUrl ?? null,
            failed_at:       new Date(),
            last_good_scrape: lastResolved?.resolved_at ?? null,
          },
        });
      }

      // Send email alert (non-blocking — never throws)
      await sendScraperAlertEmail('BoulderScraper', 'boulder', validation.failures);

      // Only write pools that passed their individual pool-level checks.
      const passingPools = pools.filter((p) => !failedPoolIds.has(p.id));

      if (passingPools.length === 0) {
        console.warn('[db] No pools passed validation — skipping all DB writes');
        return;
      }

      console.warn(
        `[db] Partial success: writing ${passingPools.length} of ${pools.length} pools ` +
        `(${failedPoolIds.size} pool(s) skipped due to validation failures)`
      );

      // Fall through to upsert logic using only the passing subset
      for (const pool of passingPools) {
        await upsertPool(pool);
      }

      return;
    }

    // ------------------------------------------------------------------
    // Validation passed — write all pools then resolve any open alerts.
    // ------------------------------------------------------------------
    for (const pool of pools) {
      await upsertPool(pool);
    }

    await prisma.scrapeAlert.updateMany({
      where: { locality_id: 'boulder', resolved_at: null },
      data:  { resolved_at: new Date() },
    });

    console.log('[db] All pools validated and saved; open alerts resolved.');

    // Send success email with summary
    const poolsSummary = pools.map(pool => ({
      poolId: pool.id,
      poolName: pool.name,
      lapSwimHoursCount: pool.lapSwimHours.length,
      timeSlotsCount: pool.schedule?.length ?? 0,
    }));
    await sendScraperSuccessEmail('BoulderScraper', 'boulder', poolsSummary);
  } catch (err: unknown) {
    console.error(
      '[db] Error writing to database:',
      err instanceof Error ? err.message : err
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Upsert a single pool's row plus its lap_swim_hours and time_slots.
 * Extracted so that the partial-success path can reuse the same logic.
 */
async function upsertPool(pool: Pool): Promise<void> {
  // ------------------------------------------------------------------
  // 1. Upsert the pool row
  // ------------------------------------------------------------------
  await prisma.pool.upsert({
    where: { id: pool.id },
    update: {
      last_scraped: new Date(),
      ...(pool.name      && { name:         pool.name }),
      ...(pool.address   && { address:      pool.address }),
      ...(pool.phoneNumber !== undefined && { phone_number: pool.phoneNumber }),
      ...(pool.website   !== undefined   && { website:      pool.website }),
    },
    create: {
      id:           pool.id,
      locality_id:  pool.city ?? 'boulder',
      name:         pool.name,
      address:      pool.address,
      latitude:     pool.location.latitude,
      longitude:    pool.location.longitude,
      last_scraped: new Date(),
      ...(pool.phoneNumber !== undefined && { phone_number: pool.phoneNumber }),
      ...(pool.website     !== undefined && { website:      pool.website }),
      ...(pool.laneCount   !== undefined && { lane_count:   pool.laneCount }),
    },
  });

  // ------------------------------------------------------------------
  // 2. Replace lap_swim_hours (delete-all then bulk insert)
  // ------------------------------------------------------------------
  await prisma.lapSwimHour.deleteMany({ where: { pool_id: pool.id } });

  if (pool.lapSwimHours.length > 0) {
    await prisma.lapSwimHour.createMany({
      data: pool.lapSwimHours.map((h) => ({
        pool_id:     pool.id,
        day_of_week: h.dayOfWeek,
        open_time:   h.openTime,
        close_time:  h.closeTime,
      })),
    });
    console.log(`[db] Saved ${pool.lapSwimHours.length} lap swim hours for "${pool.name}"`);
  }

  // ------------------------------------------------------------------
  // 3. Replace time_slots – only when the pool has a non-empty schedule
  // ------------------------------------------------------------------
  if (pool.schedule && pool.schedule.length > 0) {
    await prisma.timeSlot.deleteMany({ where: { pool_id: pool.id } });

    await prisma.timeSlot.createMany({
      data: pool.schedule.map((slot) => ({
        pool_id:     pool.id,
        day_of_week: slot.dayOfWeek,
        start_hour:  slot.startHour,
        lanes:       slot.lanes,
      })),
    });
    console.log(`[db] Saved ${pool.schedule.length} time slots for "${pool.name}"`);
  }
}

// ---------------------------------------------------------------------------
// Main (exported so server.ts can call it from the /scrape cron endpoint)
// ---------------------------------------------------------------------------

/**
 * Runs the full scrape pipeline: fetch → validate → write to DB.
 * Safe to call from HTTP handlers — never calls process.exit().
 */
export async function runScraper(): Promise<void> {
  console.log('===========================================');
  console.log('  Boulder Pool Finder – Scraper');
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log('===========================================\n');

  let pools: Pool[];

  try {
    pools = await scrapeBoulderPools();

    // Sanity-check: if we somehow got zero results, fall back entirely
    if (pools.length === 0) {
      console.warn('[index] Scraper returned 0 pools – using fallback data');
      pools = getFallbackPools();
    }
  } catch (err: unknown) {
    console.error(
      '[index] Fatal error during scrape:',
      err instanceof Error ? err.message : err
    );
    console.warn('[index] Falling back to hardcoded pool data');
    pools = getFallbackPools();
  }

  printSummary(pools);
  savePools(pools);

  // Write scraped data to PostgreSQL (no-op if DATABASE_URL is absent)
  await savePoolsToDatabase(pools);

  console.log('[index] Done.');
}

// ---------------------------------------------------------------------------
// CLI entry point — only runs when executed directly (not imported)
// ---------------------------------------------------------------------------

// `require.main === module` works for ts-node and compiled JS alike
if (require.main === module) {
  runScraper().catch((err) => {
    console.error('[index] Unhandled error:', err);
    process.exit(1);
  });
}
