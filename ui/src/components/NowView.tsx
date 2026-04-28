import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface PoolSlot {
  poolId: string;
  poolName: string;
  slots: { time: number; lanes: number; lanesHalf: number }[];
}

interface NowViewProps {
  pools: PoolSlot[];
  currentHour: number;
  onPoolClick: (pool: PoolSlot) => void;
}

const TIMELINE_HOURS = [6, 9, 12, 15, 18, 21]; // 6am to 9pm

function getCurrentLanes(pool: PoolSlot, currentHour: number): number {
  const currentHourFloor = Math.floor(currentHour);
  const minutes = (currentHour - currentHourFloor) * 60;
  const isSecondHalf = minutes >= 30;

  const slot = pool.slots.find(s => s.time === currentHourFloor);
  if (!slot) return 0;

  return isSecondHalf ? slot.lanesHalf : slot.lanes;
}

function getTimelineColor(lanes: number): string {
  if (lanes <= 0) return 'rgba(255,255,255,0.07)'; // closed
  if (lanes <= 2) return '#D85A30'; // scarce/full
  if (lanes <= 4) return '#EF9F27'; // limited/busy
  if (lanes <= 6) return '#1D9E75'; // moderate/open
  return '#5DCAA5'; // very open
}

function getCompactColor(lanes: number): string {
  if (lanes <= 0) return 'rgba(255,255,255,0.07)';
  if (lanes <= 4) return '#EF9F27';
  return '#5DCAA5';
}

function getCompactLabel(lanes: number): string {
  if (lanes <= 0) return 'closed';
  if (lanes <= 4) return 'busier';
  return 'open';
}

export function NowView({ pools, currentHour, onPoolClick }: NowViewProps) {
  // Sort pools by current lane availability (best first)
  const sortedPools = useMemo(() => {
    return [...pools].sort((a, b) => {
      const aLanes = getCurrentLanes(a, currentHour);
      const bLanes = getCurrentLanes(b, currentHour);
      return bLanes - aLanes;
    });
  }, [pools, currentHour]);

  const bestPool = sortedPools[0];
  const otherPools = sortedPools.slice(1, 3); // Show up to 2 other pools

  if (!bestPool) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No pool data available</Text>
      </View>
    );
  }

  const bestCurrentLanes = getCurrentLanes(bestPool, currentHour);

  // Build timeline for best pool
  const timeline = TIMELINE_HOURS.map(hour => {
    const slot = bestPool.slots.find(s => s.time === hour);
    return slot ? slot.lanes : 0;
  });

  // Find the last time slot with similar or better lane availability
  const lastOpenTime = bestPool.slots
    .filter(s => s.lanes >= bestCurrentLanes && s.time >= currentHour)
    .sort((a, b) => b.time - a.time)[0];

  const formatTime = (hour: number): string => {
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  };

  const availabilityText = lastOpenTime
    ? `until ${formatTime(Math.floor(lastOpenTime.time))}`
    : 'limited hours';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerText}>Swim now</Text>
      <Text style={styles.subheaderText}>
        {sortedPools.length} {sortedPools.length === 1 ? 'option' : 'great options'} near you
      </Text>

      {/* BEST PICK */}
      <TouchableOpacity
        style={styles.bestPickCard}
        onPress={() => onPoolClick(bestPool)}
        activeOpacity={0.8}
      >
        <View style={styles.bestPickHeader}>
          <Text style={styles.bestPickLabel}>★ BEST PICK</Text>
          <Text style={styles.distanceText}>1.2 mi away</Text>
        </View>

        <Text style={styles.bestPickPoolName}>{bestPool.poolName}</Text>

        <View style={styles.bestPickLanes}>
          <Text style={styles.bestPickLanesNumber}>{bestCurrentLanes}</Text>
          <Text style={styles.bestPickLanesText}>
            lane{bestCurrentLanes !== 1 ? 's' : ''} open · {availabilityText}
          </Text>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {timeline.map((lanes, idx) => (
            <View
              key={idx}
              style={[styles.timelineSegment, { backgroundColor: getTimelineColor(lanes) }]}
            />
          ))}
        </View>

        {/* Time labels */}
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineLabelText}>now</Text>
          <Text style={styles.timelineLabelText}>noon</Text>
          <Text style={styles.timelineLabelText}>5p</Text>
          <Text style={styles.timelineLabelText}>10p</Text>
        </View>
      </TouchableOpacity>

      {/* OTHER POOLS */}
      {otherPools.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Or also nearby</Text>
          {otherPools.map(pool => {
            const currentLanes = getCurrentLanes(pool, currentHour);
            const color = getCompactColor(currentLanes);
            const label = getCompactLabel(currentLanes);

            return (
              <TouchableOpacity
                key={pool.poolId}
                style={styles.compactCard}
                onPress={() => onPoolClick(pool)}
                activeOpacity={0.7}
              >
                <View style={[styles.compactBar, { backgroundColor: color }]} />
                <View style={styles.compactInfo}>
                  <Text style={styles.compactPoolName}>{pool.poolName}</Text>
                  <Text style={styles.compactSubtext}>1.8 mi · {label}</Text>
                </View>
                <Text style={[styles.compactLanes, { color }]}>{currentLanes}</Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#f1f3f5',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subheaderText: {
    fontSize: 13,
    color: '#8a929e',
    marginBottom: 16,
  },

  // Best Pick Card
  bestPickCard: {
    backgroundColor: 'rgba(29,158,117,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(29,158,117,0.32)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  bestPickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bestPickLabel: {
    fontSize: 11,
    color: '#5DCAA5',
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  distanceText: {
    fontSize: 12,
    color: '#8a929e',
  },
  bestPickPoolName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  bestPickLanes: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  bestPickLanesNumber: {
    fontSize: 32,
    fontWeight: '500',
    color: '#5DCAA5',
    lineHeight: 32,
  },
  bestPickLanesText: {
    fontSize: 13,
    color: '#8a929e',
  },
  timeline: {
    flexDirection: 'row',
    gap: 1,
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  timelineSegment: {
    flex: 1,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineLabelText: {
    fontSize: 10,
    color: '#6b727c',
  },

  // Compact Cards
  sectionLabel: {
    fontSize: 11,
    color: '#6b727c',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  compactCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 11,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactBar: {
    width: 5,
    height: 36,
    borderRadius: 3,
  },
  compactInfo: {
    flex: 1,
  },
  compactPoolName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f1f3f5',
    marginBottom: 2,
  },
  compactSubtext: {
    fontSize: 12,
    color: '#8a929e',
  },
  compactLanes: {
    fontSize: 19,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
