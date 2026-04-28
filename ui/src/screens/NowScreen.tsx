import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { usePoolSchedule } from '../hooks/usePools';
import { usePoolStore } from '../store/poolStore';
import { NowView } from '../components/NowView';
import { PoolWeekView } from '../components/PoolWeekView';
import { theme } from '../theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Every hour from 6 AM to 9 PM
const TIME_SLOTS: number[] = [];
for (let h = 6; h <= 21; h++) TIME_SLOTS.push(h);

function getTodayIndex(): number {
  return (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6
}

function getCurrentHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

interface PoolSlot {
  poolId: string;
  poolName: string;
  slots: { time: number; lanes: number; lanesHalf: number }[];
}

export default function NowScreen() {
  const { selectedLocation } = usePoolStore();
  const { data, isLoading, error } = usePoolSchedule(selectedLocation);
  const [selectedPool, setSelectedPool] = useState<PoolSlot | null>(null);

  const todayIndex = getTodayIndex();
  const selectedDay = DAYS[todayIndex];

  // Build heatmap rows for today
  const heatmapRows = useMemo(() => {
    if (!data?.pools) return [];
    return data.pools
      .filter(p => p.slots.some(s => s.dayOfWeek === selectedDay))
      .map(pool => {
        const slotMap = new Map<number, number>();
        for (const s of pool.slots) {
          if (s.dayOfWeek === selectedDay) slotMap.set(s.startHour, s.lanes);
        }
        return {
          poolId: pool.poolId,
          poolName: pool.poolName,
          slots: TIME_SLOTS.map(t => ({
            time: t,
            lanes: slotMap.get(t) ?? 0,
            lanesHalf: slotMap.get(t + 0.5) ?? 0,
          })),
        };
      });
  }, [data, selectedDay]);

  // Build week data for the selected pool (all days)
  const weekData = useMemo(() => {
    if (!data?.pools || !selectedPool) return new Map();

    const poolData = data.pools.find(p => p.poolId === selectedPool.poolId);
    if (!poolData) return new Map();

    const weekMap = new Map<string, PoolSlot>();

    DAYS.forEach(day => {
      const slotMap = new Map<number, number>();
      for (const s of poolData.slots) {
        if (s.dayOfWeek === day) slotMap.set(s.startHour, s.lanes);
      }

      weekMap.set(day, {
        poolId: poolData.poolId,
        poolName: poolData.poolName,
        slots: TIME_SLOTS.map(t => ({
          time: t,
          lanes: slotMap.get(t) ?? 0,
          lanesHalf: slotMap.get(t + 0.5) ?? 0,
        })),
      });
    });

    return weekMap;
  }, [data, selectedPool]);

  const handlePoolClick = (pool: PoolSlot) => {
    setSelectedPool(pool);
  };

  const handleBack = () => {
    setSelectedPool(null);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load schedule data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {selectedPool ? (
          <>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{selectedPool.poolName}</Text>
          </>
        ) : (
          <Text style={styles.title}>Now</Text>
        )}
      </View>

      {/* Show either NowView or PoolWeekView */}
      {selectedPool ? (
        <PoolWeekView pool={selectedPool} weekData={weekData} onBack={handleBack} />
      ) : (
        <NowView pools={heatmapRows} currentHour={getCurrentHour()} onPoolClick={handlePoolClick} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 90,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
    marginLeft: -8,
  },
  backText: {
    fontSize: 32,
    color: theme.colors.textSecondary,
    fontWeight: '300',
    lineHeight: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
  },
});
