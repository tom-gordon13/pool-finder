
import { TimeSlot } from '../../types/pool';

/**
 * ScheduleNormalizer.ts
 *
 * Normalizes time ranges and lane information into 30-minute availability slots.
 */
export class ScheduleNormalizer {

    /**
     * Converts a list of schedule entries (day, start, end, laneCount) into 30-min slots.
     */
    static normalizeSchedule(
        entries: { day: string, start: string, end: string, laneCount: number }[]
    ): TimeSlot[] {
        const result: TimeSlot[] = [];

        for (const entry of entries) {
            const startHour = this.parseTime(entry.start);
            const endHour = this.parseTime(entry.end);

            if (startHour === null || endHour === null) continue;

            // Generate slots in 0.5 increment
            // Start: 6.0, End: 8.0 -> 6.0, 6.5, 7.0, 7.5
            // Start: 6.25? -> Round to nearest 0.5?
            // Let's use 0.5 steps.
            // If start is 6.25, maybe start at 6.5? Or 6.0?
            // Simplify: Round start/end to nearest 0.5?
            // Actually, keep it simple: Iterate t from start to end with step 0.5.
            // If t + 0.5 <= end, add slot.

            // Align start to 0.5 grid
            const gridStart = Math.floor(startHour * 2) / 2;
            const gridEnd = Math.ceil(endHour * 2) / 2;

            for (let t = gridStart; t < gridEnd; t += 0.5) {
                // strict check: does the original range overlap significantly with [t, t+0.5]?
                // Overlap of [startHour, endHour] and [t, t+0.5]
                const overlapStart = Math.max(startHour, t);
                const overlapEnd = Math.min(endHour, t + 0.5);

                if (overlapEnd > overlapStart) {
                    // If overlap is tiny (e.g. 5 mins), maybe skip?
                    // Let's include it for now to be safe.
                    result.push({
                        dayOfWeek: entry.day,
                        startHour: t,
                        lanes: entry.laneCount,
                        sourceText: `${entry.start} - ${entry.end}`
                    });
                }
            }
        }

        return result;
    }

    /**
     * Consolidates duplicate slots by summing lane counts.
     */
    static consolidateSlots(slots: TimeSlot[]): TimeSlot[] {
        const map = new Map<string, TimeSlot>();

        for (const slot of slots) {
            const key = `${slot.dayOfWeek}-${slot.startHour}`;
            if (map.has(key)) {
                const existing = map.get(key)!;
                // If we have multiple entries for the same slot, what do we do?
                // Example: "Lanes 1-4 6-8pm" and "Lanes 5-8 6-8pm" -> Sum = 8.
                // Example: "Lanes 1-8 6-6:30" and "Lanes 1-8 6:30-7" -> distinct slots, no overlap.

                // If we have overlapping slots from the SAME source?
                // e.g. "6:00-7:00" and "6:30-7:30". overlap at 6:30-7:00.
                // We should SUM them.
                existing.lanes += slot.lanes;
            } else {
                map.set(key, { ...slot });
            }
        }

        return Array.from(map.values())
            .sort((a, b) => {
                if (a.dayOfWeek !== b.dayOfWeek) return 0; // naive sort
                return a.startHour - b.startHour;
            });
    }

    /**
     * Parses "5:30 AM" or "5.5" into decimal hours.
     */
    static parseTime(timeStr: string): number | null {
        const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (!match) return null;

        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2] || '0', 10);
        const period = match[3]?.toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return hours + minutes / 60;
    }
}
