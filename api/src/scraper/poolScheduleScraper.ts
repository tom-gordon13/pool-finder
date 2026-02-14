/**
 * poolScheduleScraper.ts
 *
 * Reusable module: fetches a Boulder pool schedule page and returns
 * TimeSlot[] (30-minute increments, all days) for that pool.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { LaneParser } from './parsers/LaneParser';
import { ScheduleNormalizer } from './parsers/ScheduleNormalizer';
import { TimeSlot } from '../types/pool';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const HTTP_TIMEOUT_MS = 45_000;

async function fetchHtml(url: string): Promise<string> {
  const res = await axios.get<string>(url, {
    timeout: HTTP_TIMEOUT_MS,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  return res.data;
}

function parseTimeRange(raw: string): { start: string; end: string } | null {
  const match = raw
    .trim()
    .match(
      /^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))$/i
    );
  if (!match) return null;

  let start = match[1].trim();
  const end = match[2].trim();

  if (!/am|pm/i.test(start)) {
    const m = end.match(/am|pm/i);
    if (m) start = `${start} ${m[0]}`;
  }

  return { start, end };
}

function parseScheduleTable($: ReturnType<typeof cheerio.load>): TimeSlot[] {
  const allSlots: TimeSlot[] = [];

  let $table = $('table').first();

  $('button, h2, h3, h4, h5').each((_i, el) => {
    const text = $(el).text();
    if (text.includes('Lap Pool') && text.includes('Lap Lanes Available')) {
      const $content = $(el).closest('.c-accordion__item, section, div').find('table').first();
      if ($content.length) {
        $table = $content;
      }
    }
  });

  const dayMap = new Map<number, string>();
  $table.find('thead th').each((i, th) => {
    const text = $(th).text().trim();
    const day = DAYS.find(d => d.toLowerCase() === text.toLowerCase());
    if (day) dayMap.set(i, day);
  });

  if (dayMap.size === 0) return [];

  $table.find('tbody tr').each((_r, row) => {
    $(row).find('td').each((c, cell) => {
      const day = dayMap.get(c);
      if (!day) return;

      const raw = ($(cell).html() ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .trim();

      const lines = raw.split('\n').map((l: string) => l.trim()).filter(Boolean);

      let activeRange: { start: string; end: string } | null = null;

      for (const line of lines) {
        const range = parseTimeRange(line);
        if (range) {
          activeRange = range;
          continue;
        }

        if (!activeRange) continue;

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

/**
 * Fetches and parses the schedule page at `url`.
 * Returns an array of TimeSlot (all days, 30-min increments) or [] on failure.
 */
export async function scrapePoolSchedule(url: string): Promise<TimeSlot[]> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    return parseScheduleTable($);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[poolScheduleScraper] Failed to scrape ${url}: ${msg}`);
    return [];
  }
}
