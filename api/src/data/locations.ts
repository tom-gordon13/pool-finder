export interface LocationConfig {
  id: string;
  name: string;
  dataFile: string;   // relative path from backend/data/
  center: { latitude: number; longitude: number };
  /** Map of pool ID -> schedule page URL for live scraping */
  poolScheduleUrls?: Record<string, string>;
}

export const locations: LocationConfig[] = [
  {
    id: 'boulder',
    name: 'Boulder, CO',
    dataFile: 'pools.json',
    center: { latitude: 40.0150, longitude: -105.2705 },
    poolScheduleUrls: {
      'north-boulder': 'https://bouldercolorado.gov/north-boulder-recreation-pool-schedules',
      'east-boulder':  'https://bouldercolorado.gov/east-boulder-community-center-pool-schedule',
      'south-boulder': 'https://bouldercolorado.gov/south-boulder-recreation-center-pool-schedule',
      'scott-carpenter': 'https://bouldercolorado.gov/scott-carpenter-pool-schedule',
    },
  },
];
