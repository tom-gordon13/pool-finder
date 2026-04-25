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


export interface TimeSlot {
  dayOfWeek: string;
  startHour: number; // 0-23.5 (e.g. 6.5 for 6:30am)
  lanes: number;
  sourceText?: string;
  poolId?: string;
  poolName?: string;
}

export interface LocationAvailability {
  location: string;
  day: string;
  hours: HourAvailability[];
  schedule?: TimeSlot[]; // Granular data
}

export interface PoolScheduleEntry {
  poolId: string;
  poolName: string;
  slots: TimeSlot[];
}

export interface PoolScheduleResponse {
  location: string;
  weekStart: string;
  pools: PoolScheduleEntry[];
  _metadata?: {
    stale: boolean;
    cachedAt: number;
    isRefreshing?: boolean;
  };
}
