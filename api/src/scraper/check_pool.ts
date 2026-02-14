/**
 * check_pool.ts
 *
 * Fetches a Boulder pool schedule page and prints open lap lanes
 * in 30-minute increments for each day of the current week.
 *
 * Usage:
 *   npx ts-node src/scraper/check_pool.ts <url>
 *
 * Example:
 *   npx ts-node src/scraper/check_pool.ts https://bouldercolorado.gov/north-boulder-recreation-pool-schedules
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { LaneParser } from './parsers/LaneParser';
import { ScheduleNormalizer } from './parsers/ScheduleNormalizer';
import { TimeSlot } from '../types/pool';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const url = process.argv[2];
if (!url) {
  console.error('Usage: npx ts-node src/scraper/check_pool.ts <url>');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchHtml(targetUrl: string): Promise<string> {
  const res = await axios.get<string>(targetUrl, {
    timeout: 15_000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parses a time string like "6 to 8:30 am", "9:30 am to 1 pm", "7 am to 2:30 pm"
 * into { start: string, end: string } suitable for ScheduleNormalizer.parseTime().
 */
function parseTimeRange(raw: string): { start: string; end: string } | null {
  // Normalise "to" and "-" as separator; handle "am"/"pm" with optional space
  const match = raw
    .trim()
    .match(
      /^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))$/i
    );
  if (!match) return null;

  let start = match[1].trim();
  const end = match[2].trim();

  // If start has no meridiem, inherit from end
  if (!/am|pm/i.test(start)) {
    const m = end.match(/am|pm/i);
    if (m) start = `${start} ${m[0]}`;
  }

  return { start, end };
}

function parseScheduleTable($: ReturnType<typeof cheerio.load>): TimeSlot[] {
  const allSlots: TimeSlot[] = [];

  // Find the table inside the "Lap Pool: Lap Lanes Available" accordion section.
  // The button/heading text contains that phrase; the table lives in the next sibling div.
  let $table = $('table').first(); // fallback: first table on page

  $('button, h2, h3, h4, h5').each((_i, el) => {
    const text = $(el).text();
    if (text.includes('Lap Pool') && text.includes('Lap Lanes Available')) {
      // The content div is a sibling or descendant container
      const $content = $(el).closest('.c-accordion__item, section, div').find('table').first();
      if ($content.length) {
        $table = $content;
      }
    }
  });

  // Map column index → day name from <thead>
  const dayMap = new Map<number, string>();
  $table.find('thead th').each((i, th) => {
    const text = $(th).text().trim();
    const day = DAYS.find(d => d.toLowerCase() === text.toLowerCase());
    if (day) dayMap.set(i, day);
  });

  if (dayMap.size === 0) {
    console.error('Could not find day headers in any table.');
    process.exit(1);
  }

  // Each <tr> in <tbody> is a time-block row; each <td> is a day's cell.
  // A cell may contain multiple <br>-separated entries (time + lane lines).
  $table.find('tbody tr').each((_r, row) => {
    $(row).find('td').each((c, cell) => {
      const day = dayMap.get(c);
      if (!day) return;

      // Replace <br> with newlines, strip remaining tags
      const raw = ($(cell).html() ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .trim();

      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

      let activeRange: { start: string; end: string } | null = null;

      for (const line of lines) {
        const range = parseTimeRange(line);
        if (range) {
          activeRange = range;
          continue;
        }

        if (!activeRange) continue;

        // Only count lanes from non-program lines (LaneParser filters program names)
        const laneCount = LaneParser.parseLaneCount(line);
        if (laneCount === undefined) continue;

        const count = laneCount === -1 ? 8 : laneCount;
        const slots = ScheduleNormalizer.normalizeSchedule([
          { day, start: activeRange.start, end: activeRange.end, laneCount: count },
        ]);
        allSlots.push(...slots);
      }
    });
  });

  return ScheduleNormalizer.consolidateSlots(allSlots);
}

// ---------------------------------------------------------------------------
// Format output
// ---------------------------------------------------------------------------

function formatHour(h: number): string {
  const totalMinutes = Math.round(h * 60);
  const hours24 = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
}

function printSchedule(slots: TimeSlot[], pageTitle: string): void {
  // Build current week label (Mon–Sun of current week)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  console.log(`\n${'='.repeat(62)}`);
  console.log(`  ${pageTitle}`);
  console.log(`  Open Lap Lanes — Week of ${fmt(monday)} to ${fmt(sunday)}`);
  console.log(`${'='.repeat(62)}\n`);

  // Group by day in DAYS order
  for (const day of DAYS) {
    const daySlots = slots
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => a.startHour - b.startHour);

    if (daySlots.length === 0) {
      console.log(`${day.padEnd(12)}  (no open lap lanes)`);
      continue;
    }

    console.log(`${day}`);
    for (const slot of daySlots) {
      const start = formatHour(slot.startHour);
      const end = formatHour(slot.startHour + 0.5);
      console.log(`  ${start} – ${end}  →  ${slot.lanes} lane${slot.lanes !== 1 ? 's' : ''} open`);
    }
    console.log();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`Fetching: ${url}`);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // Try to get a useful page title
  const pageTitle =
    $('h1').first().text().trim() ||
    $('title').text().split('|')[0].trim() ||
    url;

  const slots = parseScheduleTable($);

  if (slots.length === 0) {
    console.error('No schedule data found. The page structure may have changed.');
    process.exit(1);
  }

  printSchedule(slots, pageTitle);
}

main().catch(err => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
