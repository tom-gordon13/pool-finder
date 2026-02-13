/**
 * boulderScraper.ts
 *
 * Scrapes pool schedule data from the City of Boulder Parks & Recreation website.
 * Attempts to fetch live data and falls back to hardcoded data if scraping fails.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Pool, LapSwimHours } from '../types/pool';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://bouldercolorado.gov';
const AQUATICS_URL = `${BASE_URL}/services/aquatics`;
const POOL_SCHEDULES_URL = `${BASE_URL}/pool-schedules`;

const HTTP_TIMEOUT_MS = 15_000;

/** Known Boulder pool location slugs to scrape */
const KNOWN_POOL_SLUGS: Array<{
  slug: string;
  id: string;
  fallbackName: string;
}> = [
    {
      slug: '/locations/scott-carpenter-pool',
      id: 'scott-carpenter',
      fallbackName: 'Scott Carpenter Pool',
    },
    {
      slug: '/locations/east-boulder-community-center',
      id: 'east-boulder',
      fallbackName: 'East Boulder Community Center',
    },
    {
      slug: '/locations/north-boulder-recreation-center',
      id: 'north-boulder',
      fallbackName: 'North Boulder Recreation Center',
    },
    {
      slug: '/locations/south-boulder-recreation-center',
      id: 'south-boulder',
      fallbackName: 'South Boulder Recreation Center',
    },
    {
      slug: '/locations/spruce-pool',
      id: 'spruce-pool',
      fallbackName: 'Spruce Pool',
    },
  ];

/** Known coordinates for Boulder pools (lat/lng) */
const KNOWN_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'scott-carpenter': { latitude: 40.0074, longitude: -105.2519 },
  'east-boulder': { latitude: 40.0196, longitude: -105.2185 },
  'north-boulder': { latitude: 40.0469, longitude: -105.2794 },
  'south-boulder': { latitude: 39.9851, longitude: -105.2628 },
  'spruce-pool': { latitude: 40.0195, longitude: -105.2791 },
};

// ---------------------------------------------------------------------------
// Hardcoded fallback data
// ---------------------------------------------------------------------------

const FALLBACK_POOLS: Pool[] = [
  {
    id: 'scott-carpenter',
    name: 'Scott Carpenter Pool',
    address: '1505 30th St, Boulder, CO 80303',
    city: 'boulder',
    location: { latitude: 40.0074, longitude: -105.2519 },
    phoneNumber: '(303) 441-3427',
    website: 'https://bouldercolorado.gov/locations/scott-carpenter-pool',
    isPublic: true,
    laneCount: 6,
    lapSwimHours: [
      { dayOfWeek: 'Monday', openTime: '5:30 AM', closeTime: '8:00 PM' },
      { dayOfWeek: 'Tuesday', openTime: '5:30 AM', closeTime: '8:00 PM' },
      { dayOfWeek: 'Wednesday', openTime: '5:30 AM', closeTime: '8:00 PM' },
      { dayOfWeek: 'Thursday', openTime: '5:30 AM', closeTime: '8:00 PM' },
      { dayOfWeek: 'Friday', openTime: '5:30 AM', closeTime: '7:00 PM' },
      { dayOfWeek: 'Saturday', openTime: '7:00 AM', closeTime: '5:00 PM' },
      { dayOfWeek: 'Sunday', openTime: '9:00 AM', closeTime: '4:00 PM' },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'east-boulder',
    name: 'East Boulder Community Center',
    address: '5660 Sioux Dr, Boulder, CO 80303',
    city: 'boulder',
    location: { latitude: 40.0196, longitude: -105.2185 },
    phoneNumber: '(303) 441-4400',
    website: 'https://bouldercolorado.gov/locations/east-boulder-community-center',
    isPublic: true,
    laneCount: 8,
    lapSwimHours: [
      { dayOfWeek: 'Monday', openTime: '5:45 AM', closeTime: '9:30 PM' },
      { dayOfWeek: 'Tuesday', openTime: '5:45 AM', closeTime: '9:30 PM' },
      { dayOfWeek: 'Wednesday', openTime: '5:45 AM', closeTime: '9:30 PM' },
      { dayOfWeek: 'Thursday', openTime: '5:45 AM', closeTime: '9:30 PM' },
      { dayOfWeek: 'Friday', openTime: '5:45 AM', closeTime: '9:30 PM' },
      { dayOfWeek: 'Saturday', openTime: '7:45 AM', closeTime: '4:00 PM' },
      { dayOfWeek: 'Sunday', openTime: '7:45 AM', closeTime: '4:00 PM' },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'north-boulder',
    name: 'North Boulder Recreation Center',
    address: '3170 Broadway, Boulder, CO 80304',
    city: 'boulder',
    location: { latitude: 40.0469, longitude: -105.2794 },
    phoneNumber: '(303) 413-7260',
    website: 'https://bouldercolorado.gov/locations/north-boulder-recreation-center',
    isPublic: true,
    laneCount: 6,
    lapSwimHours: [
      { dayOfWeek: 'Monday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Tuesday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Wednesday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Thursday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Friday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Saturday', openTime: '6:45 AM', closeTime: '6:00 PM' },
      { dayOfWeek: 'Sunday', openTime: '6:45 AM', closeTime: '6:00 PM' },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'south-boulder',
    name: 'South Boulder Recreation Center',
    address: '1360 Gillaspie Dr, Boulder, CO 80305',
    city: 'boulder',
    location: { latitude: 39.9851, longitude: -105.2628 },
    phoneNumber: '(303) 441-3448',
    website: 'https://bouldercolorado.gov/locations/south-boulder-recreation-center',
    isPublic: true,
    laneCount: 8,
    lapSwimHours: [
      { dayOfWeek: 'Monday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Tuesday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Wednesday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Thursday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Friday', openTime: '5:45 AM', closeTime: '9:00 PM' },
      { dayOfWeek: 'Saturday', openTime: '8:45 AM', closeTime: '4:00 PM' },
      { dayOfWeek: 'Sunday', openTime: '8:45 AM', closeTime: '4:00 PM' },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'spruce-pool',
    name: 'Spruce Pool',
    address: '2102 Spruce St, Boulder, CO 80302',
    city: 'boulder',
    location: { latitude: 40.0195, longitude: -105.2791 },
    phoneNumber: '(303) 441-3426',
    website: 'https://bouldercolorado.gov/locations/spruce-pool',
    isPublic: true,
    laneCount: 6,
    lapSwimHours: [
      // Outdoor seasonal pool – hours vary; these are typical summer hours
      { dayOfWeek: 'Monday', openTime: '7:00 AM', closeTime: '7:00 PM' },
      { dayOfWeek: 'Tuesday', openTime: '7:00 AM', closeTime: '7:00 PM' },
      { dayOfWeek: 'Wednesday', openTime: '7:00 AM', closeTime: '7:00 PM' },
      { dayOfWeek: 'Thursday', openTime: '7:00 AM', closeTime: '7:00 PM' },
      { dayOfWeek: 'Friday', openTime: '7:00 AM', closeTime: '7:00 PM' },
      { dayOfWeek: 'Saturday', openTime: '8:00 AM', closeTime: '6:00 PM' },
      { dayOfWeek: 'Sunday', openTime: '8:00 AM', closeTime: '6:00 PM' },
    ],
    lastUpdated: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a URL and returns its HTML text.
 * Returns null on any network or HTTP error instead of throwing.
 */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    console.log(`  [fetch] GET ${url}`);
    const response = await axios.get<string>(url, {
      timeout: HTTP_TIMEOUT_MS,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.warn(
        `  [fetch] Failed to fetch ${url}: ${err.message} (status: ${err.response?.status ?? 'no response'})`
      );
    } else {
      console.warn(`  [fetch] Unexpected error fetching ${url}:`, err);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hours parsing helpers
// ---------------------------------------------------------------------------

const DAY_NAME_MAP: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const ORDERED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Expands "Monday-Friday" into ["Monday","Tuesday","Wednesday","Thursday","Friday"] */
function expandDayRange(raw: string): string[] {
  const trimmed = raw.trim().toLowerCase();

  // Single day
  if (DAY_NAME_MAP[trimmed]) {
    return [DAY_NAME_MAP[trimmed]];
  }

  // Range like "monday-friday" or "mon-fri"
  const rangeMatch = trimmed.match(/^(\w+)\s*[-–—]\s*(\w+)$/);
  if (rangeMatch) {
    const startFull = DAY_NAME_MAP[rangeMatch[1]];
    const endFull = DAY_NAME_MAP[rangeMatch[2]];
    if (startFull && endFull) {
      const startIdx = ORDERED_DAYS.indexOf(startFull);
      const endIdx = ORDERED_DAYS.indexOf(endFull);
      if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
        return ORDERED_DAYS.slice(startIdx, endIdx + 1);
      }
    }
  }

  // Comma-separated list like "Saturday, Sunday"
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim());
    const days: string[] = [];
    for (const part of parts) {
      const resolved = DAY_NAME_MAP[part] || DAY_NAME_MAP[part.toLowerCase()];
      if (resolved) days.push(resolved);
    }
    if (days.length > 0) return days;
  }

  return [];
}

/**
 * Normalises a raw time string like "5:30am", "8:00 PM", "8pm" to "5:30 AM"
 * style strings.  Returns the original string unchanged if it cannot be parsed.
 */
function normaliseTime(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, '');

  // Match patterns: "5:30am", "8pm", "12:00pm"
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) return raw.trim();

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? match[2] : '00';
  const meridiem = match[3].toUpperCase();

  // Validate
  if (hours < 1 || hours > 12) return raw.trim();

  return `${hours}:${minutes} ${meridiem}`;
}

/**
 * Parses a text block that may contain hours patterns like:
 *   "Monday-Friday: 5:30am-8pm"
 *   "Saturday: 7am-5pm"
 *   "Sunday: 9am-4pm"
 *
 * Returns an array of LapSwimHours entries.
 */
function parseHoursText(text: string): LapSwimHours[] {
  const results: LapSwimHours[] = [];

  // Split on newlines and semicolons to handle various formats
  const lines = text
    .split(/[\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // Pattern: "Day(s): openTime-closeTime"
    // e.g. "Monday-Friday: 5:30am-8:00pm"
    // e.g. "Saturday & Sunday: 8am - 6pm"
    const hourPattern =
      /^([A-Za-z]+(?:\s*[-–&,]\s*[A-Za-z]+)*)\s*:\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i;
    const match = line.match(hourPattern);

    if (match) {
      const daysPart = match[1];
      const openRaw = match[2];
      const closeRaw = match[3];

      const days = expandDayRange(daysPart);
      if (days.length === 0) continue;

      const openTime = normaliseTime(openRaw);
      const closeTime = normaliseTime(closeRaw);

      for (const day of days) {
        results.push({ dayOfWeek: day, openTime, closeTime });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Page-specific scrapers
// ---------------------------------------------------------------------------

/**
 * Extracts pool info from a /locations/<pool-slug> page.
 * Returns a partial Pool (no coordinates) or null if the page couldn't be parsed.
 */
async function scrapeLocationPage(
  poolId: string,
  slug: string,
  fallbackName: string
): Promise<Partial<Pool> | null> {
  const url = `${BASE_URL}${slug}`;
  const html = await fetchHtml(url);

  if (!html) {
    console.warn(`  [scraper] Could not fetch location page for ${fallbackName}`);
    return null;
  }

  const $ = cheerio.load(html);

  // --- Name ---
  const name =
    $('h1').first().text().trim() ||
    $('title').text().split('|')[0].trim() ||
    fallbackName;

  console.log(`  [scraper] Parsing "${name}" from ${url}`);

  // --- Address ---
  let address = '';
  // Boulder's CMS renders address inside elements with aria-label or class containing "address"
  const addressSelectors = [
    '[class*="address"]',
    '[itemprop="address"]',
    '.field--name-field-address',
    '.address',
  ];
  for (const sel of addressSelectors) {
    const candidate = $(sel).first().text().replace(/\s+/g, ' ').trim();
    if (candidate) {
      address = candidate;
      break;
    }
  }

  // Fallback: look for a line that looks like a street address in the page text
  if (!address) {
    const bodyText = $('body').text();
    const addrMatch = bodyText.match(/\d+\s+[\w\s]+(?:St|Dr|Ave|Blvd|Rd|Way|Ln|Pl)\b[^,]*,\s*Boulder,\s*CO\s*\d{5}/i);
    if (addrMatch) {
      address = addrMatch[0].replace(/\s+/g, ' ').trim();
    }
  }

  // --- Phone ---
  let phoneNumber: string | undefined;
  const phoneSelectors = [
    '[class*="phone"]',
    '[itemprop="telephone"]',
    '.field--name-field-phone',
    'a[href^="tel:"]',
  ];
  for (const sel of phoneSelectors) {
    const el = $(sel).first();
    const candidate = el.attr('href')?.replace('tel:', '') || el.text().trim();
    const cleaned = candidate.replace(/\s+/g, ' ').trim();
    if (/\d{3}/.test(cleaned)) {
      phoneNumber = cleaned;
      break;
    }
  }

  // Fallback phone pattern scan
  if (!phoneNumber) {
    const bodyText = $('body').text();
    const phoneMatch = bodyText.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
    if (phoneMatch) {
      phoneNumber = phoneMatch[0].trim();
    }
  }

  // --- Hours ---
  // Boulder location pages link to a pool schedule page; try to extract any
  // visible hours text from the page itself.
  let lapSwimHours: LapSwimHours[] = [];

  // Gather all text that could contain hours
  const hoursTexts: string[] = [];

  // Look for schedule-related sections
  $('[class*="hours"], [class*="schedule"], [class*="times"]').each((_i, el) => {
    hoursTexts.push($(el).text());
  });

  // Look for headings + following paragraphs mentioning "lap swim", "swim"
  $('h2, h3, h4, h5').each((_i, el) => {
    const heading = $(el).text().toLowerCase();
    if (heading.includes('lap') || heading.includes('swim') || heading.includes('hour') || heading.includes('schedule')) {
      // Grab sibling/following text
      const sibling = $(el).next();
      hoursTexts.push(sibling.text());
      hoursTexts.push($(el).parent().text());
    }
  });

  // Also scan the full page text for hours-like patterns
  hoursTexts.push($('main').text() || $('body').text());

  for (const txt of hoursTexts) {
    const parsed = parseHoursText(txt);
    if (parsed.length > 0) {
      lapSwimHours = parsed;
      console.log(`  [scraper] Found ${parsed.length} hour entries for "${name}"`);
      break;
    }
  }

  // --- Table-based schedule parsing helper ---
  const parseTableSchedule = ($doc: cheerio.Root, contextName: string): LapSwimHours[] => {
    const results: LapSwimHours[] = [];
    $doc('h2, h3, h4, h5, button').each((_i, el) => {
      const txt = $doc(el).text().trim();
      if (txt.includes('Lap Pool') && txt.includes('Lap Lanes Available')) {
        const sibling = $doc(el).next();
        const table = sibling.find('table');
        if (table.length > 0) {
          console.log(`  [scraper] Found schedule table for "${contextName}"`);

          const headers = table.find('thead th').map((_i, th) => $doc(th).text().trim()).get();

          table.find('tbody tr').each((_r, row) => {
            $doc(row).find('td').each((c, cell) => {
              const dayName = headers[c];
              if (!dayName) return;

              const expandedDays = expandDayRange(dayName);
              if (expandedDays.length === 0) return;
              const day = expandedDays[0];

              const cellHtml = $doc(cell).html() || '';
              const cellText = cellHtml.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[^>]+(>|$)/g, ' ').trim();

              const rangeRegex = /(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*[ap]m)/gi;

              let match;
              while ((match = rangeRegex.exec(cellText)) !== null) {
                let startRaw = match[1].trim();
                let endRaw = match[2].trim();

                if (!/[ap]m/i.test(startRaw)) {
                  const endMeridiem = endRaw.match(/[ap]m/i)?.[0];
                  if (endMeridiem) {
                    startRaw += ` ${endMeridiem}`;
                  }
                }

                if (!/[ap]m/i.test(match[1])) {
                  const e = endRaw.toLowerCase();
                  const sVal = parseInt(match[1], 10);
                  if (e.includes('am')) {
                    startRaw = `${match[1]} am`;
                  } else if (e.includes('pm')) {
                    const endH = parseInt(endRaw, 10);
                    if (endH !== 12 && sVal < endH) {
                      startRaw = `${match[1]} pm`;
                    } else if (endH === 12 && sVal < 12) {
                      startRaw = `${match[1]} am`;
                    } else {
                      startRaw = `${match[1]} am`;
                    }
                  }
                }

                const normalizedOpen = normaliseTime(startRaw);
                const normalizedClose = normaliseTime(endRaw);

                results.push({
                  dayOfWeek: day,
                  openTime: normalizedOpen,
                  closeTime: normalizedClose
                });
              }
            });
          });
        }
      }
    });
    return results;
  };

  // Try parsing table on main page
  const tableHours = parseTableSchedule($, name);
  if (tableHours.length > 0) {
    console.log(`  [scraper] Found ${tableHours.length} hour entries from main page table`);
    lapSwimHours.push(...tableHours);
  }

  // --- Pool schedule sub-page link ---
  // If we got no hours yet, look for a link to a dedicated pool schedule page
  if (lapSwimHours.length === 0) {
    const scheduleLink = $('a')
      .filter((_i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().toLowerCase();
        return (
          (text.includes('pool schedule') || text.includes('swim schedule') || text.includes('schedule')) &&
          href.includes('bouldercolorado')
        );
      })
      .first()
      .attr('href');

    if (scheduleLink) {
      console.log(`  [scraper] Following schedule link: ${scheduleLink}`);
      const schedHtml = await fetchHtml(scheduleLink);
      if (schedHtml) {
        const $s = cheerio.load(schedHtml);
        const schedText = $s('main').text() || $s('body').text();

        // Try text parsing
        const textHours = parseHoursText(schedText);
        if (textHours.length > 0) {
          lapSwimHours.push(...textHours);
          console.log(`  [scraper] Found ${textHours.length} hour entries from schedule page text`);
        }

        // Try table parsing on linked page
        const linkedTableHours = parseTableSchedule($s, "Linked Schedule Page");
        if (linkedTableHours.length > 0) {
          lapSwimHours.push(...linkedTableHours);
          console.log(`  [scraper] Found ${linkedTableHours.length} hour entries from schedule page table`);
        }
      }
    }
  }

  return {
    id: poolId,
    name,
    address,
    phoneNumber,
    website: url,
    isPublic: true,
    lapSwimHours,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Merges scraped partial pool data with fallback data.
 * Scraped fields take precedence; missing fields fall back to hardcoded values.
 */
function mergeWithFallback(
  scraped: Partial<Pool>,
  fallback: Pool
): Pool {
  return {
    ...fallback,
    ...scraped,
    // Prefer scraped hours only if we actually got some; otherwise keep fallback hours
    lapSwimHours:
      scraped.lapSwimHours && scraped.lapSwimHours.length > 0
        ? scraped.lapSwimHours
        : fallback.lapSwimHours,
    // Always keep coordinates from fallback (not available via scraping)
    location: fallback.location,
    lastUpdated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main scraper entry point
// ---------------------------------------------------------------------------

/**
 * Scrapes Boulder pool data from bouldercolorado.gov.
 *
 * Strategy:
 * 1. For each known pool, fetch its location page.
 * 2. Extract name, address, phone, and any visible hours.
 * 3. Merge with fallback hardcoded data (coordinates are always from fallback).
 * 4. Return the merged Pool[] array.
 *
 * If a pool page cannot be reached, the fallback data is used as-is for that pool.
 */
export async function scrapeBoulderPools(): Promise<Pool[]> {
  console.log('\n[boulderScraper] Starting Boulder pool scrape...');
  console.log(`[boulderScraper] Target: ${AQUATICS_URL}`);
  console.log(`[boulderScraper] Known pools to scrape: ${KNOWN_POOL_SLUGS.length}\n`);

  const results: Pool[] = [];

  for (const { slug, id, fallbackName } of KNOWN_POOL_SLUGS) {
    console.log(`[boulderScraper] Scraping pool: ${fallbackName}`);

    const fallback = FALLBACK_POOLS.find((p) => p.id === id);
    if (!fallback) {
      console.warn(`  [boulderScraper] No fallback data for pool id "${id}" – skipping`);
      continue;
    }

    try {
      const scraped = await scrapeLocationPage(id, slug, fallbackName);

      if (scraped) {
        const merged = mergeWithFallback(scraped, fallback);
        results.push(merged);
        console.log(
          `  [boulderScraper] Done: "${merged.name}" – ${merged.lapSwimHours.length} lap swim entries`
        );
      } else {
        console.warn(
          `  [boulderScraper] Scrape failed for "${fallbackName}", using fallback data`
        );
        results.push({ ...fallback, lastUpdated: new Date().toISOString() });
      }
    } catch (err: unknown) {
      console.error(
        `  [boulderScraper] Unexpected error scraping "${fallbackName}":`,
        err instanceof Error ? err.message : err
      );
      results.push({ ...fallback, lastUpdated: new Date().toISOString() });
    }

    // Small delay between requests to be polite to the server
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n[boulderScraper] Scrape complete. ${results.length} pools collected.`);
  return results;
}

/** Returns a copy of the hardcoded fallback data with a fresh lastUpdated timestamp. */
export function getFallbackPools(): Pool[] {
  return FALLBACK_POOLS.map((p) => ({ ...p, lastUpdated: new Date().toISOString() }));
}
