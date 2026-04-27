export interface LocationConfig {
  id: string;
  name: string;
  center: { latitude: number; longitude: number };
}

export const locations: LocationConfig[] = [
  {
    id: 'boulder',
    name: 'Boulder, CO',
    center: { latitude: 40.0150, longitude: -105.2705 },
  },
];
