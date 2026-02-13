import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAvailability } from '../hooks/usePools';
import { theme } from '../theme';
import { GradientBackground } from '../components/GradientBackground';
import { HeatmapGrid } from '../components/HeatmapGrid';
import { PoolDetailCard } from '../components/PoolDetailCard';

// Constants matching the design
const TIME_SLOTS = ["5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM"];

export default function LaneAvailabilityScreen() {
  const [selectedTime, setSelectedTime] = useState("10 AM"); // Default to 10 AM for now, or current hour
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  // We'll just fetch for "today" for now, consistent with existing logic
  // In a real app we might want to let the user pick the day
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  const { data, isLoading, isError } = useAvailability('boulder', dayName);

  // Transform data for HeatmapGrid
  const poolsData = useMemo(() => {
    if (!data) return [];

    // We need to pivot the data: 
    // The API returns { hours: [ { hour24, openPools: [ { poolId, totalLanes } ] } ] }
    // We want a list of pools, each with a map of time -> lanes

    const poolMap = new Map<string, any>();

    data.hours.forEach((slot: any) => {
      // Convert 24h to "5 AM" format
      const hour = slot.hour24;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      let hour12 = hour % 12;
      if (hour12 === 0) hour12 = 12;
      const timeLabel = `${hour12} ${ampm}`;

      if (!TIME_SLOTS.includes(timeLabel)) return;

      slot.openPools.forEach((p: any) => {
        if (!poolMap.has(p.poolId)) {
          poolMap.set(p.poolId, {
            id: p.poolId,
            name: p.poolName,
            distance: "1.2 mi", // Placeholder, API doesn't seem to have distance in availability?
            temp: "80°F",      // Placeholder
            length: "25y",     // Placeholder
            cost: "$7",        // Placeholder
            totalLanes: 0,     // Will update
            lanes: {}
          });
        }

        const poolEntry = poolMap.get(p.poolId);
        poolEntry.lanes[timeLabel] = p.laneCount;
        // Approximation of total lanes (max seen)
        if (p.laneCount > poolEntry.totalLanes) {
          poolEntry.totalLanes = p.laneCount;
        }
      });
    });

    // Sort by lanes available at selected time
    return Array.from(poolMap.values()).sort((a, b) => {
      const lanesA = a.lanes[selectedTime] ?? -1;
      const lanesB = b.lanes[selectedTime] ?? -1;
      return lanesB - lanesA;
    });

  }, [data, selectedTime]);

  const selectedPool = useMemo(() => {
    if (!selectedPoolId) return null;
    return poolsData.find(p => p.id === selectedPoolId);
  }, [poolsData, selectedPoolId]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.appTitle}>
                  Lane<Text style={styles.appTitleAccent}>Finder</Text>
                </Text>
                <Text style={styles.locationText}>Boulder, CO</Text>
              </View>
              <View style={styles.selectedTimeBadge}>
                <Text style={styles.selectedTimeLabel}>SELECTED</Text>
                <Text style={styles.selectedTimeValue}>{selectedTime}</Text>
              </View>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
          ) : isError ? (
            <Text style={{ color: 'white', textAlign: 'center', marginTop: 20 }}>Error loading data</Text>
          ) : (
            <>
              {/* Heatmap */}
              <View style={styles.heatmapContainer}>
                <HeatmapGrid
                  timeSlots={TIME_SLOTS}
                  currentHour="10 AM" // Mock current hour for visual parity
                  selectedTime={selectedTime}
                  onSelectTime={setSelectedTime}
                  pools={poolsData}
                  selectedPoolId={selectedPoolId}
                  onSelectPool={setSelectedPoolId}
                />
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                {[
                  { color: theme.colors.statusOpen.text, label: "Open" },
                  { color: theme.colors.statusLimited.text, label: "Limited" },
                  { color: theme.colors.statusScarce.text, label: "Scarce" },
                  { color: theme.colors.statusFull.text, label: "Full" },
                ].map(l => (
                  <View key={l.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={styles.legendText}>{l.label}</Text>
                  </View>
                ))}
              </View>

              {/* Detail Card */}
              <View style={styles.detailContainer}>
                <PoolDetailCard pool={selectedPool} selectedTime={selectedTime} />
              </View>
            </>
          )}

        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  appTitleAccent: {
    color: theme.colors.primary,
  },
  locationText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedTimeBadge: {
    backgroundColor: theme.colors.primaryGlow,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  selectedTimeLabel: {
    fontSize: 9,
    color: '#3a6a8a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedTimeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  heatmapContainer: {
    flexGrow: 0,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10, height: 10, borderRadius: 4, opacity: 0.6,
  },
  legendText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  detailContainer: {
    flex: 1,
    paddingHorizontal: 12,
  }
});
