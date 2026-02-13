
import * as cheerio from 'cheerio';
import { ScraperStrategy } from './ScraperStrategy';
import { TimeSlot } from '../../types/pool';
import { LaneParser } from '../parsers/LaneParser';
import { ScheduleNormalizer } from '../parsers/ScheduleNormalizer';

export class TableStrategy implements ScraperStrategy {

    canParse($: cheerio.Root): boolean {
        // Simple heuristic: if there's a table with "Monday", "Tuesday", etc. headers
        // it's likely a schedule table.
        const headers = $('table thead th').map((i, el) => $(el).text().toLowerCase()).get();
        return headers.some(h => h.includes('monday') || h.includes('mon'));
    }

    parse($: cheerio.Root, url: string): TimeSlot[] {
        const results: TimeSlot[] = [];

        // Find tables that look like schedules
        $('table').each((i, table) => {
            const $table = $(table);
            const headers = $table.find('thead th').map((j, th) => $(th).text().trim()).get();
            console.log(`[TableStrategy] Table ${i} headers:`, headers);

            // Check if headers contain days
            const dayMap = new Map<number, string>();
            headers.forEach((h, index) => {
                const day = this.expandDay(h);
                if (day) dayMap.set(index, day);
            });

            if (dayMap.size === 0) {
                console.log(`[TableStrategy] Table ${i} skipped (no day headers)`);
                return;
            }

            $table.find('tbody tr').each((r, row) => {
                const cells = $(row).find('td');
                // console.log(`[TableStrategy] Table ${i} Row ${r} has ${cells.length} cells`);

                cells.each((c, cell) => {
                    const day = dayMap.get(c);
                    if (!day) return;

                    // Extract text
                    // Replace <br> with newline to separate multiple entries in one cell
                    const cellHtml = $(cell).html() || '';
                    const cellText = cellHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, ' ').trim();

                    // Split by lines
                    const lines = cellText.split('\n');

                    let currentStart: string | null = null;
                    let currentEnd: string | null = null;

                    for (const line of lines) {
                        const cleanLine = line.trim();
                        if (!cleanLine) continue;

                        // Check for Time Range
                        const rangeRegex = /(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*[ap]m)/i;
                        const timeMatch = cleanLine.match(rangeRegex);

                        // Check for Lanes
                        const lanes = LaneParser.parseLaneCount(cleanLine);

                        if (timeMatch) {
                            // New time range found
                            currentStart = timeMatch[1];
                            currentEnd = timeMatch[2];

                            // If this line *also* has lanes, use them immediately
                            if (lanes) {
                                const count = lanes === -1 ? 8 : lanes; // Default to 8 if "All Lanes" (TODO: Use pool specific max)
                                const slots = ScheduleNormalizer.normalizeSchedule([{
                                    day,
                                    start: this.fixMeridiem(currentStart, currentEnd),
                                    end: currentEnd,
                                    laneCount: count
                                }]);
                                slots.forEach(s => s.sourceText = cleanLine);
                                results.push(...slots);

                                // Reset current time? 
                                // Usually "Time Lanes" is a complete entry.
                                // But sometimes: "Time \n Lanes" -> handled by next iteration
                                // If "Time Lanes", we consumed it.
                                // Unless there are *more* lanes for the same time on next line?
                                // Unlikely. Let's keep currentStart/End valid just in case, but typically we are done for this block.
                            }
                        } else if (lanes) {
                            // Found lanes, check if we have an active time context
                            if (currentStart && currentEnd) {
                                // Important: Check if this line looks like a restriction/program?
                                // e.g. "Riptide lanes 4-8"
                                // Heuristic: If it starts with "Lanes" or "Lane", it's likely availability.
                                // If it starts with something else, it might be a program.
                                // But `LaneParser` is loose.

                                // For now, accept it. (MVP)
                                const count = lanes === -1 ? 8 : lanes;
                                const slots = ScheduleNormalizer.normalizeSchedule([{
                                    day,
                                    start: this.fixMeridiem(currentStart, currentEnd),
                                    end: currentEnd,
                                    laneCount: count
                                }]);
                                slots.forEach(s => s.sourceText = `[Context: ${currentStart}-${currentEnd}] ${cleanLine}`);
                                results.push(...slots);
                            } else {
                                console.log(`[TableStrategy] Found lanes "${cleanLine}" but no active time range`);
                            }
                        }
                    }
                });
            });
        });

        return results;
    }

    private expandDay(h: string): string | null {
        const lower = h.toLowerCase();
        if (lower.includes('mon')) return 'Monday';
        if (lower.includes('tue')) return 'Tuesday';
        if (lower.includes('wed')) return 'Wednesday';
        if (lower.includes('thu')) return 'Thursday';
        if (lower.includes('fri')) return 'Friday';
        if (lower.includes('sat')) return 'Saturday';
        if (lower.includes('sun')) return 'Sunday';
        return null;
    }

    private fixMeridiem(start: string, end: string): string {
        // Same logic as before: if start lacks AM/PM, infer from end
        if (!/[ap]m/i.test(start)) {
            const m = end.match(/[ap]m/i);
            if (m) return `${start} ${m[0]}`;
        }
        return start;
    }
}
