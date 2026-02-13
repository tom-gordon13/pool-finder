
import { ScraperService } from './src/scraper/ScraperService';

async function main() {
    const url = process.argv[2] || 'https://bouldercolorado.gov/north-boulder-recreation-pool-schedules';
    console.log(`Testing scraper against: ${url}\n`);

    const service = new ScraperService();
    // Pass a dummy name since we are just testing the URL
    const results = await service.scrapePool(url, "Test Pool");

    if (results.length === 0) {
        console.log("No schedule data found.");
        return;
    }

    // Group by Day
    const byDay = results.reduce((acc, curr) => {
        acc[curr.dayOfWeek] = acc[curr.dayOfWeek] || [];
        acc[curr.dayOfWeek].push(curr);
        return acc;
    }, {} as Record<string, typeof results>);

    // Order of days
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (const day of dayOrder) {
        const slots = byDay[day];
        if (!slots) continue;

        console.log(`\n=== ${day} ===`);
        // Sort by startHour
        slots.sort((a, b) => a.startHour - b.startHour);

        for (const slot of slots) {
            // Format start and end time
            const formatTime = (h: number) => {
                const hour = Math.floor(h);
                const min = (h % 1) * 60;
                const period = hour >= 12 ? 'PM' : 'AM';
                let dispHour = hour % 12;
                if (dispHour === 0) dispHour = 12;
                const dispMin = min === 0 ? '00' : min.toString().padStart(2, '0');
                return `${dispHour}:${dispMin} ${period}`;
            };

            const startStr = formatTime(slot.startHour);
            const endStr = formatTime(slot.startHour + 0.5);

            console.log(`  ${startStr.padEnd(8)} - ${endStr.padEnd(8)} | ${slot.lanes} lanes`);
        }
    }
}

main();
