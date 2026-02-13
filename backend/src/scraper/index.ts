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
 */

import fs from 'fs';
import path from 'path';
import { scrapeBoulderPools, getFallbackPools } from './boulderScraper';
import { Pool } from '../types/pool';

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
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
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

  console.log('[index] Done.');
}

main().catch((err) => {
  console.error('[index] Unhandled error:', err);
  process.exit(1);
});
