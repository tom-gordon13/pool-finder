import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { usePoolStore } from '../store/poolStore';

interface PoolSlot {
  poolId: string;
  poolName: string;
  slots: { time: number; lanes: number; lanesHalf: number }[];
}

interface NowViewProps {
  pools: PoolSlot[];
  currentHour: number;
}

function getCurrentLanes(pool: PoolSlot, currentHour: number): number {
  // Find the slot that contains the current time
  const currentHourFloor = Math.floor(currentHour);
  const minutes = (currentHour - currentHourFloor) * 60;

  // Check if we're in the first half (:00-:29) or second half (:30-:59)
  const isSecondHalf = minutes >= 30;

  const slot = pool.slots.find(s => s.time === currentHourFloor);
  if (!slot) return 0;

  return isSecondHalf ? slot.lanesHalf : slot.lanes;
}

function getStatusColor(lanes: number) {
  if (lanes <= 0) return theme.colors.statusClosed;
  if (lanes <= 2) return theme.colors.statusScarce;   // 1-2: orange-red
  if (lanes <= 4) return theme.colors.statusLimited;  // 3-4: yellow
  if (lanes <= 6) return theme.colors.statusModerate; // 5-6: light green
  return theme.colors.statusOpen;                     // 7-8: dark green
}

function getStatusLabel(lanes: number): string {
  if (lanes <= 0) return 'Closed';
  if (lanes <= 2) return 'Scarce';   // 1-2
  if (lanes <= 4) return 'Limited';  // 3-4
  if (lanes <= 6) return 'Moderate'; // 5-6
  return 'Available';                // 7-8
}

export function NowView({ pools, currentHour }: NowViewProps) {
  const { favoritePoolIds, toggleFavorite } = usePoolStore();

  // Sort pools by current lane availability, with favorites at the top
  const sortedPools = useMemo(() => {
    return [...pools].sort((a, b) => {
      const aIsFavorite = favoritePoolIds.has(a.poolId);
      const bIsFavorite = favoritePoolIds.has(b.poolId);

      // Favorites first
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // Then by current lane count
      const aLanes = getCurrentLanes(a, currentHour);
      const bLanes = getCurrentLanes(b, currentHour);
      return bLanes - aLanes;
    });
  }, [pools, currentHour, favoritePoolIds]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerText}>Current Lane Availability</Text>
      <Text style={styles.subheaderText}>
        {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </Text>

      {sortedPools.map((pool) => {
        const currentLanes = getCurrentLanes(pool, currentHour);
        const statusColor = getStatusColor(currentLanes);
        const isFavorite = favoritePoolIds.has(pool.poolId);

        return (
          <View key={pool.poolId} style={[styles.poolCard, isFavorite && styles.poolCardFavorite]}>
            <View style={styles.poolCardHeader}>
              <View style={styles.poolCardTitleContainer}>
                <Text style={styles.poolName}>{pool.poolName}</Text>
                {isFavorite && <Text style={styles.favoriteIcon}>★</Text>}
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(pool.poolId)}
                style={styles.favoriteButton}
              >
                <Text style={styles.favoriteButtonText}>
                  {isFavorite ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.poolCardBody}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                <Text style={[styles.statusText, { color: statusColor.text }]}>
                  {getStatusLabel(currentLanes)}
                </Text>
              </View>
              <Text style={[styles.laneCount, { color: statusColor.text }]}>
                {currentLanes > 0 ? `${currentLanes} lane${currentLanes !== 1 ? 's' : ''}` : 'Closed'}
              </Text>
            </View>
          </View>
        );
      })}

      {sortedPools.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No pool data available</Text>
        </View>
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
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subheaderText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  poolCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  poolCardFavorite: {
    borderColor: 'rgba(255,215,0,0.3)',
    backgroundColor: 'rgba(255,215,0,0.03)',
  },
  poolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  poolCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  poolName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  favoriteIcon: {
    fontSize: 14,
    color: '#FFD700',
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteButtonText: {
    fontSize: 24,
    color: '#FFD700',
  },
  poolCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  laneCount: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
