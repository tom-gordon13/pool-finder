import axios from 'axios';
import * as cheerio from 'cheerio';
import { Pool, TimeSlot } from '../types/pool';
import { ScraperStrategy } from './strategies/ScraperStrategy';
import { TableStrategy } from './strategies/TableStrategy';
import { TextStrategy } from './strategies/TextStrategy';
import { ScheduleNormalizer } from './parsers/ScheduleNormalizer';

export class ScraperService {
    private strategies: ScraperStrategy[];

    constructor() {
        this.strategies = [
            new TableStrategy(),
            new TextStrategy()
        ];
    }

    /**
     * Main entry point: Scrapes a pool location URL.
     */
    async scrapePool(url: string, poolName: string): Promise<TimeSlot[]> {
        console.log(`[ScraperService] Scraping ${poolName} (${url})`);

        try {
            const html = await this.fetchHtml(url);
            if (!html) return [];

            const $ = cheerio.load(html);
            let results: TimeSlot[] = [];

            // 1. Try strategies on the main page
            results = this.runStrategies($, url);

            // 2. If no detailed schedule found, look for linked schedule page
            if (results.length === 0) {
                const scheduleUrl = this.findScheduleLink($, url);
                if (scheduleUrl) {
                    console.log(`[ScraperService] Creating linked schedule page: ${scheduleUrl}`);
                    const linkedHtml = await this.fetchHtml(scheduleUrl);
                    if (linkedHtml) {
                        const $linked = cheerio.load(linkedHtml);
                        results = this.runStrategies($linked, scheduleUrl);
                    }
                }
            }

            // 3. Consolidate overlapping slots
            return ScheduleNormalizer.consolidateSlots(results);

        } catch (error) {
            console.error(`[ScraperService] Error scraping ${poolName}:`, error);
            return [];
        }
    }

    private runStrategies($: cheerio.Root, url: string): TimeSlot[] {
        for (const strategy of this.strategies) {
            if (strategy.canParse($, url)) {
                console.log(`[ScraperService] Strategy ${strategy.constructor.name} accepted ${url}`);
                const data = strategy.parse($, url);
                if (data.length > 0) {
                    console.log(`[ScraperService] Strategy ${strategy.constructor.name} found ${data.length} slots`);
                    return data;
                }
            }
        }
        return [];
    }

    private findScheduleLink($: cheerio.Root, baseUrl: string): string | null {
        // Heuristic: Link text contains "schedule" or "hours"
        let candidate: string | null = null;

        $('a').each((i, el) => {
            if (candidate) return;
            const txt = $(el).text().toLowerCase();
            const href = $(el).attr('href');
            if (!href) return;

            if (txt.includes('pool schedule') || (txt.includes('lap') && txt.includes('schedule'))) {
                // Resolve relative URL
                candidate = new URL(href, baseUrl).toString();
            }
        });

        return candidate;
    }

    private async fetchHtml(url: string): Promise<string | null> {
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            return data;
        } catch (err) {
            console.error(`[ScraperService] HTTP Error for ${url}:`, err);
            return null;
        }
    }
}
