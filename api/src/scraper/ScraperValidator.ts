/**
 * ScraperValidator
 *
 * A pure validation module for swimming-pool scraper results.
 * It performs a battery of checks on the data returned by a city scraper
 * and accumulates all failures before returning a single ValidationResult.
 * It has no side effects and makes no database calls.
 */

import { LapSwimHours, TimeSlot } from '../types/pool';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * The shape of data returned by each city scraper for a single pool.
 */
export interface ScraperResult {
  poolId: string;
  poolName: string;
  /** The URL that was scraped to produce this result. */
  scrapeUrl: string;
  lapSwimHours: LapSwimHours[];
  timeSlots: TimeSlot[];
}

/**
 * A single validation failure.
 * When `poolId` is null the failure is locality-level (not tied to one pool).
 */
export interface ValidationFailure {
  poolId: string | null;
  poolName: string | null;
  reason: string;
  scrapeUrl?: string;
}

/**
 * The aggregated result of a validation run.
 * `valid` is true only when `failures` is empty.
 */
export interface ValidationResult {
  valid: boolean;
  failures: ValidationFailure[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Regex for the expected time format, e.g. "5:30 AM" or "10:00 PM".
 * Case-insensitive to tolerate "am" / "pm" variants.
 */
const TIME_PATTERN = /^\d{1,2}:\d{2}\s*(AM|PM)$/i;

/**
 * Parse a time string such as "5:30 AM" or "8:00 PM" into a decimal
 * 24-hour value (e.g. 5.5, 20.0).
 *
 * Mirrors the `parseTimeToHour24` helper used in `routes/locations.ts`.
 *
 * @returns A decimal hour in [0, 24), or NaN if the string cannot be parsed.
 */
function parseTimeToDecimalHour(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return NaN;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'AM') {
    // 12 AM  midnight → hour 0
    if (hours === 12) hours = 0;
  } else {
    // 12 PM  noon → hour 12 (no change); everything else +12
    if (hours !== 12) hours += 12;
  }

  return hours + minutes / 60;
}

// ---------------------------------------------------------------------------
// ScraperValidator class
// ---------------------------------------------------------------------------

/**
 * Validates the output of a city pool scraper before any data is written to
 * the database.
 *
 * All checks are accumulative — validation never short-circuits on the first
 * failure. This ensures callers receive a complete picture of every problem
 * found in a single run.
 *
 * Usage:
 * ```ts
 * const result = ScraperValidator.validate(scraperResults, expectedPoolIds);
 * if (!result.valid) {
 *   logger.error(ScraperValidator.formatFailuresForLog('BoulderScraper', result.failures));
 *   return; // do NOT write to DB
 * }
 * ```
 */
export class ScraperValidator {
  /**
   * Run all validation checks against a set of scraper results.
   *
   * @param results        - Array of per-pool data returned by the scraper.
   * @param expectedPoolIds - Pool IDs currently stored in the DB for this locality.
   * @returns A ValidationResult whose `valid` flag is true iff `failures` is empty.
   */
  static validate(
    results: ScraperResult[],
    expectedPoolIds: string[],
  ): ValidationResult {
    const failures: ValidationFailure[] = [];

    // ------------------------------------------------------------------
    // Check 1 — Pool count
    // ------------------------------------------------------------------
    if (results.length === 0) {
      failures.push({
        poolId: null,
        poolName: null,
        reason: `Scraper returned 0 pools (expected ${expectedPoolIds.length})`,
      });
    } else if (results.length < expectedPoolIds.length) {
      failures.push({
        poolId: null,
        poolName: null,
        reason:
          `Scraper returned ${results.length} pools, expected ` +
          `${expectedPoolIds.length} — possible partial failure`,
      });
    }

    // ------------------------------------------------------------------
    // Check 2 — Per-pool checks
    // ------------------------------------------------------------------
    for (const result of results) {
      const poolContext = {
        poolId: result.poolId,
        poolName: result.poolName,
        scrapeUrl: result.scrapeUrl,
      };

      const { lapSwimHours, timeSlots } = result;

      // 2a — Zero lap swim hours
      if (lapSwimHours.length === 0) {
        failures.push({
          ...poolContext,
          reason: 'Pool has no lap swim hours',
        });
        // Still run remaining checks that don't depend on lapSwimHours entries.
      }

      // 2b — Missing days (fewer than 5 entries implies sparse data)
      if (lapSwimHours.length > 0 && lapSwimHours.length < 5) {
        failures.push({
          ...poolContext,
          reason:
            `Pool has only ${lapSwimHours.length} lap swim hour ` +
            `entries (expected at least 5 days)`,
        });
      }

      // 2c, 2d, 2e — Per-entry time checks
      for (const entry of lapSwimHours) {
        ScraperValidator._validateLapSwimEntry(entry, poolContext, failures);
      }

      // 2f — TimeSlot sanity (only when timeSlots are present)
      if (timeSlots.length > 0) {
        ScraperValidator._validateTimeSlots(timeSlots, poolContext, failures);
      }
    }

    return {
      valid: failures.length === 0,
      failures,
    };
  }

  /**
   * Validate a single `LapSwimHours` entry (checks 2c, 2d, 2e).
   * Failures are pushed directly into the provided `failures` array.
   */
  private static _validateLapSwimEntry(
    entry: LapSwimHours,
    poolContext: { poolId: string; poolName: string; scrapeUrl: string },
    failures: ValidationFailure[],
  ): void {
    const { openTime, closeTime } = entry;

    // 2c — Unparseable times
    const openValid = TIME_PATTERN.test(openTime);
    const closeValid = TIME_PATTERN.test(closeTime);

    if (!openValid) {
      failures.push({
        ...poolContext,
        reason: `Unparseable time value: '${openTime}'`,
      });
    }
    if (!closeValid) {
      failures.push({
        ...poolContext,
        reason: `Unparseable time value: '${closeTime}'`,
      });
    }

    // 2d & 2e require parseable values — skip if either failed format check.
    if (!openValid || !closeValid) return;

    const openHour = parseTimeToDecimalHour(openTime);
    const closeHour = parseTimeToDecimalHour(closeTime);

    // 2d — Open before close
    if (closeHour <= openHour) {
      failures.push({
        ...poolContext,
        reason: `closeTime (${closeTime}) is not after openTime (${openTime})`,
      });
    }

    // 2e — Unreasonable hours (before 4 AM or after 11 PM)
    if (openHour < 4.0 || closeHour > 23.0) {
      failures.push({
        ...poolContext,
        reason: `Hours outside reasonable range: ${openTime}–${closeTime}`,
      });
    }
  }

  /**
   * Validate the `timeSlots` array for a pool (check 2f).
   * Failures are pushed directly into the provided `failures` array.
   */
  private static _validateTimeSlots(
    timeSlots: TimeSlot[],
    poolContext: { poolId: string; poolName: string; scrapeUrl: string },
    failures: ValidationFailure[],
  ): void {
    for (const slot of timeSlots) {
      if (slot.startHour < 4.0 || slot.startHour > 23.0) {
        failures.push({
          ...poolContext,
          reason:
            `TimeSlot has startHour ${slot.startHour} outside reasonable ` +
            `range [4.0, 23.0] (day: ${slot.dayOfWeek})`,
        });
      }

      if (slot.lanes < 1 || slot.lanes > 20) {
        failures.push({
          ...poolContext,
          reason:
            `TimeSlot has lanes=${slot.lanes} outside valid range ` +
            `[1, 20] (day: ${slot.dayOfWeek}, startHour: ${slot.startHour})`,
        });
      }
    }
  }

  /**
   * Format a list of validation failures into a human-readable multi-line
   * string suitable for log output or an alert email body.
   *
   * @param scraperName - Identifies the scraper (e.g. "BoulderScraper").
   * @param failures    - The failures from a ValidationResult.
   * @returns A formatted string; empty string if `failures` is empty.
   */
  static formatFailuresForLog(
    scraperName: string,
    failures: ValidationFailure[],
  ): string {
    if (failures.length === 0) return '';

    const lines: string[] = [
      `[${scraperName}] Validation failed — ${failures.length} issue(s) found:`,
      '',
    ];

    for (let i = 0; i < failures.length; i++) {
      const f = failures[i];
      const label =
        f.poolId !== null
          ? `  [${i + 1}] Pool "${f.poolName}" (id: ${f.poolId})`
          : `  [${i + 1}] Locality-level`;

      lines.push(label);
      lines.push(`       Reason : ${f.reason}`);

      if (f.scrapeUrl) {
        lines.push(`       URL    : ${f.scrapeUrl}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}
