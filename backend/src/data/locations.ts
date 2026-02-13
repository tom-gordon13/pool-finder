export interface LocationConfig {
  id: string;
  name: string;
  dataFile: string;   // relative path from backend/data/
  center: { latitude: number; longitude: number };
}

export const locations: LocationConfig[] = [
  {
    id: 'boulder',
    name: 'Boulder, CO',
    dataFile: 'pools.json',
    center: { latitude: 40.0150, longitude: -105.2705 },
  },
];
