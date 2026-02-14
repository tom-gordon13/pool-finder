
/**
 * LaneParser.ts
 *
 * Extracts the number of available lanes from a text description.
 * Examples:
 * - "Lanes 1-4" -> 4
 * - "Lanes 1, 2, 3" -> 3
 * - "All lanes" -> returns undefined (caller should use max lanes)
 * - "Lanes 5-8" -> 4
 * - "Lane 1" -> 1
 */

export const ALL_LANES = -1;

export class LaneParser {

    /**
     * Parses text to find the number of lanes.
     * Returns the count of lanes, or -1 for "All Lanes".
     */
    static parseLaneCount(text: string): number | undefined {
        const cleanText = text.toLowerCase().trim();

        // Filter out known programs if the line starts with them
        // Heuristic: If it starts with "riptide", "bam", "elevation", "lessons", "synchro", "clinic"
        // it is likely NOT open for general public.
        // Valid starts: "lane", "lap", "open", "all", number (e.g. "1-4").
        // Also "shallow", "deep"?

        const invalidStarts = ['riptide', 'bam', 'elevation', 'lessons', 'synchro', 'clinic', 'pre/post', 'bhs', 'neptunes', 'expand'];
        if (invalidStarts.some(s => cleanText.startsWith(s))) {
            return undefined;
        }

        // Implicit "All Lanes" keywords
        if (cleanText.includes('lap swim') || cleanText === 'open swim' || cleanText.includes('all lanes') || cleanText.includes('full pool')) {
            // Check if there are specific lanes mentioned too? "Lap swim lanes 1-4"
            const hasSpecifics = /\d/.test(cleanText);
            if (!hasSpecifics) return ALL_LANES; // Code for "All available"
        }

        // Explicit range: "lanes 1-4", "lanes 5 to 8"
        // Regex for "digit [separator] digit"
        // We look for patterns like "1-4", "1 to 4", "lane 1"

        // Pattern: Lanes X to Y
        const rangeMatch = cleanText.match(/lanes?\s+(\d+)\s*(?:-|to|through)\s*(\d+)/i);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            if (!isNaN(start) && !isNaN(end)) {
                return Math.abs(end - start) + 1;
            }
        }

        // Pattern: Lanes X, Y, Z
        if (cleanText.includes('lane')) {
            // "Lanes 1, 2, 3"
            const parts = cleanText.split(/,|&|and/);
            let count = 0;
            for (const part of parts) {
                if (/\d+/.test(part)) { // simple heuristic: if it has a number, it's a lane
                    count++;
                }
            }
            if (count > 0 && count < 15) return count; // Sanity check
        }

        // Single lane: "Lane 1"
        const singleLaneMatch = cleanText.match(/lane\s+\d+/i);
        if (singleLaneMatch) {
            return 1;
        }

        return undefined;
    }
}
