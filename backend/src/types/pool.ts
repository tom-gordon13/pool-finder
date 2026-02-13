export interface Location {
  latitude: number;
  longitude: number;
}

export interface LapSwimHours {
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
}

export interface TimeSlot {
  dayOfWeek: string;
  startHour: number; // 0-23.5 (e.g. 6.5 for 6:30am)
  lanes: number;
  sourceText?: string; // Debugging info
}

export interface Pool {
  id: string;
  name: string;
  address: string;
  city: string;
  location: Location;
  phoneNumber?: string;
  website?: string;
  isPublic: boolean;
  lapSwimHours: LapSwimHours[]; // Deprecated, but keeping for backward compat
  schedule?: TimeSlot[]; // New granular data
  laneCount?: number;
  lastUpdated?: string;
  distance?: number;
}
