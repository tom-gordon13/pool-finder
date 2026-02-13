export interface Location {
  latitude: number;
  longitude: number;
}

export interface LapSwimHours {
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
}

export interface Pool {
  id: string;
  name: string;
  address: string;
  location: Location;
  phoneNumber?: string;
  website?: string;
  isPublic: boolean;
  lapSwimHours: LapSwimHours[];
  lastUpdated?: string;
  distance?: number; // Distance from user in miles/km
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface PoolAvailabilitySlot {
  poolId: string;
  poolName: string;
  laneCount: number;
  openTime: string;
  closeTime: string;
}

export interface HourAvailability {
  hour: string;       // e.g. "6:00 AM"
  hour24: number;     // e.g. 6
  openPools: PoolAvailabilitySlot[];
  totalOpenPools: number;
  totalLanes: number;
}

export interface LocationAvailability {
  location: string;
  day: string;
  hours: HourAvailability[];
}
